import { Router } from 'express'
import { Agent, Consent, Event, Lead, Property, Review, Saved, User } from '../models/index.js'
import { badRequest, conflict, notFound } from '../lib/errors.js'
import { audit } from '../lib/misc.js'
import { broadcast } from '../lib/events.js'
import { geoForIp } from '../lib/geo.js'
import { eventsBody, meDelete, meUpdate, parse, reviewCreate } from '../lib/schemas.js'
import { sha256 } from '../lib/security.js'
import { out, publicProperty } from '../lib/serialize.js'
import { endSession, publicUser } from '../services/auth.js'
import { PUBLIC_FILTER } from '../services/property.js'
import { requireAuth } from '../middleware/index.js'

const router = Router()
router.use(requireAuth)

const myLeadsFilter = (user) => ({ $or: [{ userId: user.id }, { phone: user.phone }] })

/* ------------------------------------------------------------------ profile */
router.get('/', (req, res) => res.json({ user: publicUser(req.user) }))

router.patch('/', async (req, res) => {
  const d = parse(meUpdate, req.body)
  req.user.set(d)
  await req.user.save()
  if (req.user.role === 'agent' && (d.name || d.city)) {
    await Agent.updateMany({ userId: req.user.id }, { ...(d.name ? { name: d.name } : {}), ...(d.city ? { city: d.city } : {}) })
  }
  res.json({ user: publicUser(req.user) })
})

/* ------------------------------------------------------------ saved homes */
router.get('/saved', async (req, res) => {
  const saved = await Saved.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean()
  const ids = saved.map((s) => s.propertyId)
  const props = await Property.find({ _id: { $in: ids }, ...PUBLIC_FILTER }).lean()
  const byId = new Map(props.map((p) => [p._id, p]))
  res.json({ ids, items: ids.map((id) => byId.get(id)).filter(Boolean).map(publicProperty) })
})

router.post('/saved/:propertyId', async (req, res) => {
  if (!(await Property.exists({ _id: req.params.propertyId }))) throw notFound('Property not found.')
  await Saved.updateOne({ userId: req.user.id, propertyId: req.params.propertyId }, { $setOnInsert: { userId: req.user.id, propertyId: req.params.propertyId } }, { upsert: true })
  res.status(201).json({ ok: true })
})

router.delete('/saved/:propertyId', async (req, res) => {
  await Saved.deleteOne({ userId: req.user.id, propertyId: req.params.propertyId })
  res.json({ ok: true })
})

/** Merge the browser's saved list into the account right after sign-in. */
router.put('/saved', async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? [...new Set(req.body.ids.map(String))].slice(0, 200) : []
  const valid = await Property.find({ _id: { $in: ids } }, '_id').lean()
  await Promise.all(valid.map((p) => Saved.updateOne({ userId: req.user.id, propertyId: p._id }, { $setOnInsert: { userId: req.user.id, propertyId: p._id } }, { upsert: true })))
  res.json({ ok: true, count: valid.length })
})

/* --------------------------------------------------------------- enquiries */
router.get('/inquiries', async (req, res) => {
  const leads = await Lead.find(myLeadsFilter(req.user)).sort({ createdAt: -1 }).lean()
  res.json({ items: out(leads).map(({ interest, notes, assignedAgentId, consentId, ...rest }) => rest) })
})

/* -------------------------------------------------------- behaviour events */
/**
 * Browsing events (viewed a home, searched, saved, compared) — only stored for a signed-in person, so
 * the team has their history before the first call. Kept 12 months, erased with the account.
 */
router.post('/events', async (req, res) => {
  const { events } = parse(eventsBody, req.body)
  // One lookup per request (cached per IP for a day in lib/geo.js), not per event — a batch is all one visit.
  const geo = await geoForIp(req.ip)
  await Event.insertMany(events.map((e) => ({ userId: req.user.id, type: e.type, data: e.data, ip: req.ip, geo: geo ?? undefined, at: e.at ? new Date(e.at) : new Date() })))
  res.status(201).json({ ok: true, stored: events.length })
})

/* -------------------------------------------------------------------- reviews */
/** This person's own reviews (any status) — lets the page show "you already reviewed this, pending approval". */
router.get('/reviews', async (req, res) => {
  res.json({ items: out(await Review.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean()) })
})

/**
 * Leave (or edit) a rating + review for an agent or a property. One per person per target — resubmitting
 * replaces the old text/rating and puts it back to `pending`, so admin sees the current version, not the old
 * one. Reviewing your own agent profile, or a listing you posted yourself, is refused (real reviews only).
 */
router.post('/reviews', async (req, res) => {
  const d = parse(reviewCreate, req.body)
  if (d.targetType === 'property') {
    const property = await Property.findById(d.targetId).select('submittedBy').lean()
    if (!property) throw notFound('Property not found.')
    if (property.submittedBy === req.user.id) throw badRequest('You cannot review your own listing.')
  } else {
    const agent = await Agent.findById(d.targetId).select('userId').lean()
    if (!agent) throw notFound('Agent not found.')
    if (agent.userId === req.user.id) throw badRequest('You cannot review your own agent profile.')
  }
  const existing = await Review.findOne({ userId: req.user.id, targetType: d.targetType, targetId: d.targetId })
  let review
  if (existing) {
    existing.set({ rating: d.rating, text: d.text ?? '', status: 'pending', reviewNote: '' })
    await existing.save()
    review = existing
  } else {
    review = await Review.create({ userId: req.user.id, userName: req.user.name, targetType: d.targetType, targetId: d.targetId, rating: d.rating, text: d.text ?? '' })
  }
  broadcast('admin', 'review:new', { id: review.id, targetType: review.targetType, targetId: review.targetId, rating: review.rating, userName: review.userName })
  res.status(existing ? 200 : 201).json({ item: out(review) })
})

/* ------------------------------------------------------------ data rights */
/** Everything we hold about the signed-in person. */
router.get('/data', async (req, res) => {
  const [agent, leads, consents, saved, events] = await Promise.all([
    Agent.findOne({ userId: req.user.id }).lean(),
    Lead.find(myLeadsFilter(req.user)).lean(),
    Consent.find({ $or: [{ userId: req.user.id }, { phone: req.user.phone }] }).lean(),
    Saved.find({ userId: req.user.id }).lean(),
    Event.find({ userId: req.user.id }).sort({ at: -1 }).limit(1000).lean(),
  ])
  res.json({ exportedAt: new Date().toISOString(), user: publicUser(req.user), agent: out(agent), leads: out(leads), consents: out(consents), savedProperties: out(saved), events: out(events) })
})

/** Stop being contacted: withdraws every consent. The account stays. */
router.post('/withdraw-consent', async (req, res) => {
  const now = new Date()
  const [consents, leads] = await Promise.all([
    Consent.updateMany({ $or: [{ userId: req.user.id }, { phone: req.user.phone }], withdrawnAt: { $exists: false } }, { withdrawnAt: now }),
    Lead.updateMany(myLeadsFilter(req.user), { consent: false }),
  ])
  audit(req, 'withdraw-consent', 'user', req.user.id)
  res.json({ ok: true, consentsWithdrawn: consents.modifiedCount, leadsUpdated: leads.modifiedCount })
})

/** Erasure: removes the account and the personal data attached to it (see docs). */
router.delete('/', async (req, res) => {
  parse(meDelete, req.body)
  const user = req.user
  if (user.role === 'admin' && (await User.countDocuments({ role: 'admin', active: { $ne: false } })) <= 1) {
    throw conflict('You are the only active admin — make someone else an admin before deleting this account.')
  }
  const now = new Date()
  const mask = `deleted-${sha256(user.phone).slice(0, 12)}`
  await Promise.all([
    Saved.deleteMany({ userId: user.id }),
    Event.deleteMany({ userId: user.id }),
    Lead.updateMany(myLeadsFilter(user), { userName: 'Deleted user', userEmail: '', phone: mask, message: '[removed at the person’s request]', budget: '', interest: null, notes: [], userId: null }),
    // The rating + text stay (they're real feedback about the agent/property), the name and account link don't.
    Review.updateMany({ userId: user.id }, { userName: 'Deleted user', userId: null }),
    Consent.updateMany({ $or: [{ userId: user.id }, { phone: user.phone }] }, { phone: sha256(user.phone), userId: null, withdrawnAt: now, ip: '', userAgent: '' }),
  ])
  if (user.role === 'agent') {
    await Agent.updateMany({ userId: user.id }, { active: false, status: 'rejected', name: 'Deleted agent', phone: '', email: '', bio: '', avatar: '', agency: '', reraId: '' })
    await Property.updateMany({ submittedBy: user.id }, { active: false })
  }
  audit(req, 'erase-account', 'user', user.id)
  await User.deleteOne({ _id: user.id })
  endSession(res)
  res.json({ ok: true })
})

export default router
