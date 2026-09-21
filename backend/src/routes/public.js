import { Router } from 'express'
import { Agent, Faq, Post, Property, Testimonial } from '../models/index.js'
import { notFound, AppError, badRequest } from '../lib/errors.js'
import { escapeRegex, parse, readPhoneToken } from '../lib/security.js'
import { leadCreate, propertyQuery } from '../lib/schemas.js'
import { out, paginate, publicAgent, publicPost, publicProperty } from '../lib/serialize.js'
import { PUBLIC_FILTER, findPropertyByParam, propertyPath } from '../services/property.js'
import { publicSettings } from '../services/settings.js'
import { createLead } from '../services/leads.js'
import { leadLimiter } from '../middleware/index.js'

const router = Router()

const SORTS = {
  newest: { postedDate: -1, createdAt: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  'area-desc': { areaSqft: -1 },
}
const exact = (v) => new RegExp(`^${escapeRegex(v)}$`, 'i')
const AGENT_PUBLIC = { status: 'approved', active: { $ne: false } }
const ACTIVE = { active: { $ne: false } }

/** Builds the MongoDB filter for the public listing search. */
export function listingFilter(q) {
  const f = { ...PUBLIC_FILTER }
  if (q.purpose) f.purpose = q.purpose
  if (q.city) f.city = exact(q.city)
  if (q.type) f.type = exact(q.type)
  if (q.beds !== undefined) f.beds = q.beds >= 4 ? { $gte: 4 } : q.beds
  if (q.possession) f.possessionStatus = exact(q.possession)
  if (q.maxPrice) f.price = { $lte: q.maxPrice }
  if (q.featured) f.featured = q.featured === 'true'
  if (q.agentId) f.agentId = q.agentId
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i')
    f.$or = [{ title: rx }, { locality: rx }, { city: rx }]
  }
  return f
}

router.get('/public/settings', async (_req, res) => res.json(await publicSettings()))

/** Everything the public website needs in one call — also what the build scripts read to pre-render. */
router.get('/public/bootstrap', async (_req, res) => {
  const [settings, properties, agents, posts, faqs, testimonials] = await Promise.all([
    publicSettings(),
    Property.find(PUBLIC_FILTER).sort(SORTS.newest).lean(),
    Agent.find(AGENT_PUBLIC).lean(),
    Post.find(ACTIVE).sort({ date: -1 }).lean(),
    Faq.find(ACTIVE).sort({ order: 1, createdAt: 1 }).lean(),
    Testimonial.find(ACTIVE).sort({ order: 1, createdAt: 1 }).lean(),
  ])
  res.json({
    settings,
    properties: properties.map(publicProperty),
    agents: agents.map(publicAgent),
    posts: posts.map(publicPost),
    faqs: out(faqs),
    testimonials: out(testimonials),
  })
})

/* -------------------------------------------------------------- properties */
router.get('/properties', async (req, res) => {
  const q = parse(propertyQuery, req.query)
  const filter = listingFilter(q)
  const [items, total] = await Promise.all([
    Property.find(filter).sort(SORTS[q.sort]).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Property.countDocuments(filter),
  ])
  res.json({ items: items.map(publicProperty), ...paginate(total, q.page, q.limit) })
})

/** One listing by slug — or by an old slug / old id, which answers with `redirect: true` and the canonical path. */
router.get('/properties/:param', async (req, res) => {
  const property = await findPropertyByParam(req.params.param)
  if (!property) throw notFound('Property not found.')

  const isPublic = property.active !== false && (property.reviewStatus ?? 'approved') === 'approved'
  const isOwner = req.user && (req.user.role === 'admin' || (req.user.role === 'agent' && property.submittedBy === req.user.id))
  if (!isPublic && !isOwner) {
    // deactivated (but once live) listings say "gone"; agent drafts must not reveal that they exist
    if ((property.reviewStatus ?? 'approved') === 'approved') throw new AppError(410, 'gone', 'This listing is no longer available.')
    throw notFound('Property not found.')
  }

  const agent = property.agentId ? await Agent.findOne({ _id: property.agentId, ...AGENT_PUBLIC }).lean() : null
  const canonicalPath = propertyPath(property)
  res.json({
    property: isPublic ? publicProperty(property) : out(property),
    agent: agent ? publicAgent(agent) : null,
    canonicalPath,
    redirect: req.params.param !== property.slug, // an old id, an old slug or different capitals → the website redirects to canonicalPath
    ...(isPublic ? {} : { preview: true }),
  })
})

/* ----------------------------------------------------------- agents, content */
router.get('/agents', async (_req, res) => {
  const agents = await Agent.find(AGENT_PUBLIC).sort({ rating: -1, name: 1 }).lean()
  res.json({ items: agents.map(publicAgent) })
})

router.get('/agents/:id', async (req, res) => {
  const agent = await Agent.findOne({ _id: req.params.id, ...AGENT_PUBLIC }).lean()
  if (!agent) throw notFound('Agent not found.')
  const properties = await Property.find({ ...PUBLIC_FILTER, agentId: agent._id }).sort(SORTS.newest).lean()
  res.json({ agent: publicAgent(agent), properties: properties.map(publicProperty) })
})

router.get('/blog', async (_req, res) => {
  res.json({ items: (await Post.find(ACTIVE).sort({ date: -1 }).lean()).map(publicPost) })
})

router.get('/blog/:slug', async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug.toLowerCase(), ...ACTIVE }).lean()
  if (!post) throw notFound('Post not found.')
  res.json({ post: publicPost(post) })
})

router.get('/faqs', async (req, res) => {
  const filter = { ...ACTIVE, ...(req.query.page ? { pages: String(req.query.page) } : {}) }
  res.json({ items: out(await Faq.find(filter).sort({ order: 1, createdAt: 1 }).lean()) })
})

router.get('/testimonials', async (_req, res) => {
  res.json({ items: out(await Testimonial.find(ACTIVE).sort({ order: 1, createdAt: 1 }).lean()) })
})

/* ------------------------------------------------------------------- leads */
/**
 * Enquiry from the contact page or a property page. `phoneToken` (from POST /auth/verify-phone) proves the
 * number was checked with an OTP; without it the lead is stored as "not verified".
 */
router.post('/leads', leadLimiter, async (req, res) => {
  const d = parse(leadCreate, req.body)
  if (d.propertyId) {
    const exists = await Property.exists({ _id: d.propertyId })
    if (!exists) throw badRequest('That property does not exist.')
  }
  const verifiedPhone = readPhoneToken(d.phoneToken)
  const ownNumber = Boolean(req.user && req.user.phone === d.phone) // a signed-in person's own (already OTP-verified) number
  const lead = await createLead(req, d, { user: req.user, verified: verifiedPhone === d.phone || ownNumber, source: d.source })
  res.status(201).json({ ok: true, id: lead.id, status: lead.status })
})

export default router
