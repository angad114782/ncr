import { Router } from 'express'
import { Agent, Lead, Property, User } from '../models/index.js'
import { AppError, conflict, forbidden, notFound } from '../lib/errors.js'
import { newId } from '../lib/ids.js'
import { audit, contentChanged } from '../lib/misc.js'
import { broadcast } from '../lib/events.js'
import { notifyTeam } from '../lib/notify.js'
import { agentProfile, agentPropertyCreate, agentPropertyImport, agentPropertyUpdate, leadPatch, leadQuery, parse } from '../lib/schemas.js'
import { out, paginate } from '../lib/serialize.js'
import { saveProperty } from '../services/property.js'
import { loadAgent, requireRole } from '../middleware/index.js'

/**
 * The property agent's own panel API. Every query is scoped to THIS agent (`agentId` comes from the login,
 * never from the request), and the moderation rules are enforced here:
 *   • a listing is always saved pending + hidden and stamped with the agent — only an admin can approve it;
 *   • Featured / Verified / Active / review fields sent by an agent are ignored;
 *   • editing a rejected listing resubmits it for review;
 *   • an agent can switch an APPROVED listing on/off, nothing else.
 */
const router = Router()
router.use(requireRole('agent'), loadAgent)

const today = () => new Date().toISOString().slice(0, 10)
const REJECTED = 'Your agent registration was not approved, so you cannot post listings. Please contact us.'

const ownListing = async (req) => {
  const p = await Property.findOne({ _id: req.params.id, agentId: req.agent.id })
  if (!p) throw notFound('Listing not found.')
  return p
}

/* ----------------------------------------------------------------- profile */
router.get('/profile', (req, res) => res.json({ agent: out(req.agent) }))

router.patch('/profile', async (req, res) => {
  const d = parse(agentProfile, req.body)
  req.agent.set(d) // status / rating / dealsClosed are not in the schema, so they can't be edited here
  await req.agent.save()
  if (d.name || d.city) await User.updateOne({ _id: req.user.id }, { ...(d.name ? { name: d.name } : {}), ...(d.city ? { city: d.city } : {}) })
  if (req.agent.status === 'approved') contentChanged('agent-profile')
  res.json({ agent: out(req.agent) })
})

router.get('/stats', async (req, res) => {
  const props = await Property.find({ agentId: req.agent.id }, 'reviewStatus active').lean()
  const ids = (await Property.find({ agentId: req.agent.id }, '_id').lean()).map((p) => p._id)
  const leads = await Lead.find({ propertyId: { $in: ids } }, 'status').lean()
  const review = (p) => p.reviewStatus ?? 'approved'
  res.json({
    status: req.agent.status,
    live: props.filter((p) => review(p) === 'approved' && p.active !== false).length,
    pending: props.filter((p) => review(p) === 'pending').length,
    rejected: props.filter((p) => review(p) === 'rejected').length,
    hidden: props.filter((p) => review(p) === 'approved' && p.active === false).length,
    newEnquiries: leads.filter((l) => l.status === 'Pending').length,
    totalEnquiries: leads.length,
  })
})

/* ---------------------------------------------------------------- listings */
router.get('/properties', async (req, res) => {
  const items = await Property.find({ agentId: req.agent.id }).sort({ createdAt: -1 }).lean()
  res.json({ items: out(items) })
})

router.get('/properties/:id', async (req, res) => res.json({ property: out(await ownListing(req)) }))

async function createOwn(req, data) {
  return saveProperty(newId('p'), {
    ...data,
    agentId: req.agent.id,
    submittedBy: req.user.id,
    reviewStatus: 'pending',
    reviewNote: '',
    active: false,
    featured: false,
    verified: false,
    postedDate: today(),
  }, { create: true })
}

router.post('/properties', async (req, res) => {
  if (req.agent.status === 'rejected') throw forbidden(REJECTED)
  const property = await createOwn(req, parse(agentPropertyCreate, req.body))
  audit(req, 'agent-create-listing', 'property', property.id)
  broadcast('admin', 'listing:pending', { id: property.id, title: property.title, agentName: req.agent.name })
  notifyTeam('New listing waiting for review', `${req.agent.name} posted “${property.title}” (${property.city}).`).catch(() => {})
  res.status(201).json({ property: out(property) })
})

/** Bulk add (CSV import): every row becomes a pending listing of this agent. */
router.post('/properties/import', async (req, res) => {
  if (req.agent.status === 'rejected') throw forbidden(REJECTED)
  const { items } = parse(agentPropertyImport, req.body)
  const created = []
  for (const item of items) created.push(await createOwn(req, item)) // one by one so same-title rows get distinct slugs
  audit(req, 'agent-import-listings', 'property', '', { count: created.length })
  broadcast('admin', 'listing:pending', { count: created.length, agentName: req.agent.name })
  notifyTeam('New listings waiting for review', `${req.agent.name} imported ${created.length} listings.`).catch(() => {})
  res.status(201).json({ added: created.length, items: out(created) })
})

router.patch('/properties/:id', async (req, res) => {
  if (req.agent.status === 'rejected') throw forbidden(REJECTED)
  const existing = await ownListing(req)
  const d = parse(agentPropertyUpdate, req.body)
  const review = existing.reviewStatus ?? 'approved'
  const property = await saveProperty(existing.id, {
    ...d,
    // an edited rejected listing goes back for review; an approved one keeps its approval
    ...(review === 'rejected' ? { reviewStatus: 'pending', reviewNote: '', active: false } : {}),
  })
  audit(req, 'agent-update-listing', 'property', property.id)
  if (review === 'approved') contentChanged('listing-updated')
  else if (review === 'rejected') notifyTeam('Listing resubmitted', `${req.agent.name} fixed “${property.title}”.`).catch(() => {})
  res.json({ property: out(property) })
})

router.patch('/properties/:id/active', async (req, res) => {
  const existing = await ownListing(req)
  if ((existing.reviewStatus ?? 'approved') !== 'approved') throw conflict('Only approved listings can be switched on or off — this one is still waiting for review.', 'not_approved')
  existing.active = req.body?.active === true
  await existing.save()
  contentChanged('listing-toggled')
  res.json({ property: out(existing) })
})

router.delete('/properties/:id', async (req, res) => {
  const existing = await ownListing(req)
  await existing.deleteOne()
  audit(req, 'agent-delete-listing', 'property', existing.id)
  if ((existing.reviewStatus ?? 'approved') === 'approved') contentChanged('listing-deleted')
  res.json({ ok: true })
})

/* ------------------------------------------------------------------- leads */
/** Enquiries that came in on THIS agent's listings — and only those. */
router.get('/leads', async (req, res) => {
  const q = parse(leadQuery, req.query)
  const ids = (await Property.find({ agentId: req.agent.id }, '_id').lean()).map((p) => p._id)
  const filter = { propertyId: { $in: ids }, ...(q.status ? { status: q.status } : {}) }
  const [items, total] = await Promise.all([
    Lead.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Lead.countDocuments(filter),
  ])
  // an agent sees the enquirer's contact details, not the sales team's internal scoring
  res.json({ items: out(items).map(({ interest, notes, intent, consentId, assignedAgentId, ...rest }) => rest), ...paginate(total, q.page, q.limit) })
})

router.patch('/leads/:id', async (req, res) => {
  const { status } = parse(leadPatch, req.body)
  const lead = await Lead.findById(req.params.id)
  const owns = lead?.propertyId && (await Property.exists({ _id: lead.propertyId, agentId: req.agent.id }))
  if (!lead || !owns) throw notFound('Enquiry not found.')
  if (!status) throw new AppError(400, 'bad_request', 'Nothing to update.')
  lead.status = status
  await lead.save()
  res.json({ ok: true, status: lead.status })
})

export default router
