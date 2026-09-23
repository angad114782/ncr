import { Router } from 'express'
import { Agent, Event, Lead, Property, User } from '../models/index.js'
import { badRequest, notFound } from '../lib/errors.js'
import { audit, contentChanged } from '../lib/misc.js'
import { broadcast } from '../lib/events.js'
import { notifyPerson } from '../lib/notify.js'
import { adminPropertyCreate, adminPropertyQuery, adminPropertyUpdate, bulkBody, parse, propertyImport } from '../lib/schemas.js'
import { escapeRegex } from '../lib/security.js'
import { newId } from '../lib/ids.js'
import { out, paginate } from '../lib/serialize.js'
import { assertAgentApproved, saveProperty } from '../services/property.js'
import { z } from 'zod'

const router = Router()

const review = (p) => p.reviewStatus ?? 'approved'

/** Tells the agent how their listing was decided — WhatsApp/e-mail, and live in their open agent panel. */
async function tellAgent(property, subject, text) {
  broadcast(`agent:${property.agentId}`, 'listing:status', { id: property.id, reviewStatus: review(property), reviewNote: property.reviewNote ?? '' })
  const agent = property.agentId ? await Agent.findById(property.agentId) : null
  if (agent) notifyPerson({ phone: agent.phone, email: agent.email }, subject, text).catch(() => {})
}

/** Makes a listing live (approves it). Refuses while its agent is not approved — their contact must not go public. */
async function approve(property, req) {
  await assertAgentApproved(property)
  property.set({ reviewStatus: 'approved', reviewNote: '', active: true })
  await property.save()
  audit(req, 'approve-listing', 'property', property.id)
  tellAgent(property, 'Your listing is live', `“${property.title}” was approved and is now live.`)
  return property
}

router.get('/', async (req, res) => {
  const q = parse(adminPropertyQuery, req.query)
  const filter = {}
  if (q.reviewStatus) filter.reviewStatus = q.reviewStatus === 'approved' ? { $in: ['approved', null] } : q.reviewStatus
  if (q.active) filter.active = q.active === 'true' ? { $ne: false } : false
  if (q.agentId) filter.agentId = q.agentId
  if (q.city) filter.city = q.city
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i')
    filter.$or = [{ title: rx }, { locality: rx }, { city: rx }, { slug: rx }]
  }
  const [items, total, pending] = await Promise.all([
    Property.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Property.countDocuments(filter),
    Property.countDocuments({ reviewStatus: 'pending' }),
  ])
  res.json({ items: out(items), pendingReview: pending, ...paginate(total, q.page, q.limit) })
})

router.get('/:id', async (req, res) => {
  const p = await Property.findById(req.params.id)
  if (!p) throw notFound('Listing not found.')
  res.json({ property: out(p) })
})

/**
 * Who has shown real interest in this one listing: signed-in visitors who viewed it (`Event`,
 * `type: 'view'`, `data.id` — only ever recorded for a signed-in account, docs/rules.md §15, never
 * for an anonymous browse) and everyone who enquired on it (`Lead`, which always has a phone number,
 * verified or not). `signedInOnly` on the view count is the same caveat Search Analytics gives —
 * most browsing is anonymous and never reaches the server, so this is a real sample, not a total.
 */
router.get('/:id/analytics', async (req, res) => {
  const { id } = req.params
  if (!(await Property.exists({ _id: id }))) throw notFound('Listing not found.')

  const [viewed, leads] = await Promise.all([
    Event.aggregate([
      { $match: { type: 'view', 'data.id': id } },
      { $sort: { at: -1 } },
      { $group: { _id: '$userId', views: { $sum: 1 }, lastViewedAt: { $first: '$at' } } },
      { $sort: { lastViewedAt: -1 } },
    ]),
    Lead.find({ propertyId: id }).sort({ createdAt: -1 }).limit(50).lean(),
  ])

  const users = viewed.length ? await User.find({ _id: { $in: viewed.map((v) => v._id) } }).select('name phone').lean() : []
  const userById = new Map(users.map((u) => [String(u._id), u]))
  const visitors = viewed
    .map((v) => ({ name: userById.get(String(v._id))?.name ?? '', phone: userById.get(String(v._id))?.phone ?? '', views: v.views, lastViewedAt: v.lastViewedAt }))
    .filter((v) => v.phone)

  res.json({
    signedInOnly: true,
    totalViews: viewed.reduce((sum, v) => sum + v.views, 0),
    visitors,
    leads: leads.map((l) => ({ id: String(l._id), name: l.userName, phone: l.phone, phoneVerified: l.phoneVerified, status: l.status, intent: l.intent, createdAt: l.createdAt })),
  })
})

router.post('/', async (req, res) => {
  const d = parse(adminPropertyCreate, req.body)
  if (d.active !== false && d.agentId) await assertAgentApproved({ agentId: d.agentId })
  const property = await saveProperty(newId('p'), d, { create: true })
  audit(req, 'create-listing', 'property', property.id)
  contentChanged('listing-created')
  res.status(201).json({ property: out(property) })
})

router.patch('/:id', async (req, res) => {
  const d = parse(adminPropertyUpdate, req.body)
  const existing = await Property.findById(req.params.id)
  if (!existing) throw notFound('Listing not found.')

  // Switching a waiting listing on counts as approving it (same as the admin panel's toggle).
  const goingLive = d.active === true && review(existing) !== 'approved' && d.reviewStatus === undefined
  if (goingLive || d.reviewStatus === 'approved') {
    await assertAgentApproved({ agentId: d.agentId ?? existing.agentId })
    Object.assign(d, { reviewStatus: 'approved', active: true })
  }
  if (d.reviewStatus === 'rejected') d.active = false
  if (d.agentId && d.agentId !== existing.agentId && (d.active ?? existing.active) !== false) await assertAgentApproved({ agentId: d.agentId })

  const wasReview = review(existing)
  const property = await saveProperty(existing.id, d)
  audit(req, 'update-listing', 'property', property.id)
  contentChanged('listing-updated')
  if (wasReview !== 'approved' && review(property) === 'approved') tellAgent(property, 'Your listing is live', `“${property.title}” was approved and is now live.`)
  if (wasReview !== 'rejected' && review(property) === 'rejected') tellAgent(property, 'Your listing needs changes', `“${property.title}”: ${property.reviewNote || 'please review the details and resubmit.'}`)
  res.json({ property: out(property) })
})

router.post('/:id/approve', async (req, res) => {
  const p = await Property.findById(req.params.id)
  if (!p) throw notFound('Listing not found.')
  await approve(p, req)
  contentChanged('listing-approved')
  res.json({ property: out(p) })
})

router.post('/:id/reject', async (req, res) => {
  const { note } = parse(z.object({ note: z.string().trim().max(500).optional() }), req.body)
  const p = await Property.findById(req.params.id)
  if (!p) throw notFound('Listing not found.')
  p.set({ reviewStatus: 'rejected', active: false, reviewNote: note ?? '' })
  await p.save()
  audit(req, 'reject-listing', 'property', p.id)
  contentChanged('listing-rejected')
  tellAgent(p, 'Your listing needs changes', `“${p.title}”: ${note || 'please review the details and resubmit.'}`)
  res.json({ property: out(p) })
})

router.delete('/:id', async (req, res) => {
  const p = await Property.findByIdAndDelete(req.params.id)
  if (!p) throw notFound('Listing not found.')
  audit(req, 'delete-listing', 'property', p.id, { title: p.title })
  contentChanged('listing-deleted')
  res.json({ ok: true })
})

/** activate / deactivate / delete / approve / reject many at once. Returns what worked and what didn't. */
router.post('/bulk/action', async (req, res) => {
  const { ids, action } = parse(bulkBody, req.body)
  const result = { done: 0, failed: [] }
  for (const id of ids) {
    try {
      const p = await Property.findById(id)
      if (!p) continue
      if (action === 'delete') await p.deleteOne()
      else if (action === 'deactivate') await Property.updateOne({ _id: id }, { active: false })
      else if (action === 'reject') await Property.updateOne({ _id: id }, { reviewStatus: 'rejected', active: false })
      else await approve(p, req) // "activate" and "approve" both make it live
      result.done++
    } catch (err) {
      result.failed.push({ id, reason: err.message })
    }
  }
  audit(req, `bulk-${action}`, 'property', '', { count: ids.length })
  contentChanged('listings-bulk')
  res.json(result)
})

/** CSV import: the browser parses the CSV and sends the rows. A row whose id already exists updates it. */
router.post('/import/rows', async (req, res) => {
  const { items } = parse(propertyImport, req.body)
  let added = 0
  let updated = 0
  for (const item of items) {
    const { id, ...data } = item
    const existing = id ? await Property.exists({ _id: id }) : null
    if (data.agentId && data.active !== false) await assertAgentApproved({ agentId: data.agentId }).catch(() => { throw badRequest(`Row “${data.title}”: the agent is not approved.`) })
    await saveProperty(existing ? id : newId('p'), data, { create: !existing })
    existing ? updated++ : added++
  }
  audit(req, 'import-listings', 'property', '', { added, updated })
  contentChanged('listings-import')
  res.status(201).json({ added, updated })
})

export default router
