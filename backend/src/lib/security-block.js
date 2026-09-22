import { config } from '../config.js'
import { newId } from './ids.js'
import { SecurityBlock } from '../models/index.js'

// 24 hours → 48 hours → 7 days; a 4th offense (after the 7-day block itself expires and they come back) is permanent.
const HOUR = 60 * 60_000
const LADDER_MS = [24 * HOUR, 48 * HOUR, 7 * 24 * HOUR]
const MAX_LOG = 20

const keyFor = (kind, value) => `${kind}:${value}`

/** The real admin account is never throttled or blocked by this system, however abusive its traffic looks. */
const isExempt = (kind, value) => kind === 'phone' && value === config.adminPhone

/**
 * Records one abuse event (a tripped rate limit, or a phone that keeps asking for OTPs and never verifies) and
 * escalates the block for that key up the ladder — but only once per "sentence": while a block from an earlier
 * offense is still active, further events for the same key are recorded (for the admin's log) without moving
 * the ladder again, so a burst of requests during an active block can't jump straight to permanent.
 *
 * Uses a MongoDB aggregation-pipeline update so the read-and-escalate decision happens atomically in the
 * database — safe against two requests for the same key landing at the same moment.
 */
export async function registerOffense(kind, value, reason, path = '') {
  if (!value || isExempt(kind, value)) return
  const key = keyFor(kind, value)
  const now = new Date()
  const candidateId = newId('sb') // only used if this insert is the one that creates the document

  await SecurityBlock.findOneAndUpdate(
    { key },
    [
      {
        $set: {
          _id: { $ifNull: ['$_id', candidateId] }, // an upsert pipeline skips the schema's string-id default, so it's set here
          kind,
          value,
          firstOffenseAt: { $ifNull: ['$firstOffenseAt', now] },
          // Escalate only when not already serving a block from an earlier offense.
          strikes: {
            $cond: [
              { $or: [{ $eq: ['$permanent', true] }, { $and: [{ $ne: ['$blockedUntil', null] }, { $gt: ['$blockedUntil', now] }] }] },
              { $ifNull: ['$strikes', 0] },
              { $add: [{ $ifNull: ['$strikes', 0] }, 1] },
            ],
          },
        },
      },
      {
        $set: {
          permanent: { $or: ['$permanent', { $gt: ['$strikes', LADDER_MS.length] }] },
          blockedUntil: {
            $cond: [
              { $gt: ['$strikes', LADDER_MS.length] },
              null,
              { $add: [now, { $arrayElemAt: [LADDER_MS, { $subtract: ['$strikes', 1] }] }] },
            ],
          },
          reason,
          lastOffenseAt: now,
        },
      },
    ],
    { upsert: true, updatePipeline: true },
  )
  await SecurityBlock.updateOne({ key }, { $push: { log: { $each: [{ at: now, reason, path }], $slice: -MAX_LOG } } })
}

/** `null` if not blocked, otherwise `{ permanent }` or `{ until }` — enough to write a clear message. */
export async function checkBlock(kind, value) {
  if (!value || isExempt(kind, value)) return null
  const doc = await SecurityBlock.findOne({ key: keyFor(kind, value) }).select('permanent blockedUntil').lean()
  if (!doc) return null
  if (doc.permanent) return { permanent: true }
  if (doc.blockedUntil && doc.blockedUntil > new Date()) return { until: doc.blockedUntil }
  return null
}

export const BLOCKED_MESSAGE = 'Too many attempts from this connection. Access has been suspended for security reasons — please try again later or contact support.'
