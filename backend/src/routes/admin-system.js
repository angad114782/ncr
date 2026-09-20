import { Router } from 'express'
import { z } from 'zod'
import { Agent, Audit, Consent, Faq, Lead, LegalVersion, Post, Property, Setting, Testimonial, User } from '../models/index.js'
import { badRequest } from '../lib/errors.js'
import { audit, contentChanged, rebuildNow, rebuildStatus } from '../lib/misc.js'
import { listQuery, parse, settingBody } from '../lib/schemas.js'
import { escapeRegex } from '../lib/security.js'
import { out, paginate } from '../lib/serialize.js'
import { SETTING_KEYS, adminSettings, saveSetting } from '../services/settings.js'

const router = Router()

/* --------------------------------------------------------------- settings */
router.get('/settings', async (_req, res) => res.json(await adminSettings()))

/** Saves one setting (company, siteContent, ticker, topBanner, cities, propertyTypes, marketing, whatsapp, mail). */
router.put('/settings/:key', async (req, res) => {
  const { key } = req.params
  if (!SETTING_KEYS.includes(key)) throw badRequest(`Unknown setting "${key}". Use one of: ${SETTING_KEYS.join(', ')}.`)
  const { value } = parse(settingBody, req.body)
  if ((key === 'cities' || key === 'propertyTypes') && !(Array.isArray(value) && value.every((v) => typeof v === 'string' && v.trim()))) throw badRequest(`${key} must be a list of names.`)
  const saved = await saveSetting(key, value, req.user)
  audit(req, 'update-settings', 'setting', key)
  if (!['whatsapp', 'mail'].includes(key)) contentChanged(`settings-${key}`)
  res.json({ key, value: saved })
})

/** Legal pages: every published version, newest first. */
router.get('/legal-history', async (req, res) => {
  const kind = z.enum(['privacy', 'terms', 'disclaimer']).optional().parse(req.query.kind)
  const items = await LegalVersion.find(kind ? { kind } : {}).sort({ createdAt: -1 }).limit(100).lean()
  res.json({ items: out(items) })
})

/* ------------------------------------------------------------- dashboard */
router.get('/stats', async (_req, res) => {
  const day = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [properties, live, pendingListings, agents, pendingAgents, users, leads, newLeads, hot, weekLeads, posts, byIntent] = await Promise.all([
    Property.countDocuments(),
    Property.countDocuments({ active: { $ne: false }, reviewStatus: { $in: ['approved', null] } }),
    Property.countDocuments({ reviewStatus: 'pending' }),
    Agent.countDocuments({ status: 'approved' }),
    Agent.countDocuments({ status: 'pending' }),
    User.countDocuments(),
    Lead.countDocuments(),
    Lead.countDocuments({ status: 'Pending' }),
    Lead.countDocuments({ intent: 'Hot', status: 'Pending' }),
    Lead.countDocuments({ createdAt: { $gt: day } }),
    Post.countDocuments({ active: { $ne: false } }),
    Lead.aggregate([{ $group: { _id: '$intent', n: { $sum: 1 } } }]),
  ])
  res.json({
    properties: { total: properties, live, pendingReview: pendingListings },
    agents: { approved: agents, pending: pendingAgents },
    users,
    leads: { total: leads, pending: newLeads, hotPending: hot, last7Days: weekLeads, byIntent: Object.fromEntries(byIntent.map((r) => [r._id ?? 'Cold', r.n])) },
    posts,
  })
})

router.get('/audit', async (req, res) => {
  const q = parse(listQuery, req.query)
  const [items, total] = await Promise.all([Audit.find({}).sort({ at: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(), Audit.countDocuments()])
  res.json({ items: out(items), ...paginate(total, q.page, q.limit) })
})

/** Consent records (who accepted which sentence and when) — search by phone number. */
router.get('/consents', async (req, res) => {
  const q = parse(listQuery, req.query)
  const filter = q.q ? { phone: new RegExp(escapeRegex(q.q)) } : {}
  const [items, total] = await Promise.all([Consent.find(filter).sort({ acceptedAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(), Consent.countDocuments(filter)])
  res.json({ items: out(items), ...paginate(total, q.page, q.limit) })
})

/* ----------------------------------------------------- rebuild / backup */
router.get('/rebuild', (_req, res) => res.json(rebuildStatus()))
router.post('/rebuild', async (req, res) => {
  audit(req, 'rebuild', 'site', '')
  res.json(await rebuildNow('manual'))
})

/** A JSON backup of the website's content and leads. Secrets (tokens, passwords) and one-time codes are never included. */
router.get('/backup', async (req, res) => {
  const [properties, agents, users, posts, faqs, testimonials, leads, settings] = await Promise.all([
    Property.find().lean(), Agent.find().lean(), User.find().lean(), Post.find().lean(), Faq.find().lean(), Testimonial.find().lean(), Lead.find().lean(), Setting.find({ _id: { $nin: ['whatsapp', 'mail'] } }).lean(),
  ])
  audit(req, 'backup', 'site', '')
  res
    .set('Content-Disposition', `attachment; filename="ncr-backup-${new Date().toISOString().slice(0, 10)}.json"`)
    .json({ exportedAt: new Date().toISOString(), properties: out(properties), agents: out(agents), users: out(users), posts: out(posts), faqs: out(faqs), testimonials: out(testimonials), leads: out(leads), settings: settings.map((s) => ({ key: s._id, value: s.value })) })
})

export default router
