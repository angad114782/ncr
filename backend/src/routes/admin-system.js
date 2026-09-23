import { Router } from 'express'
import { z } from 'zod'
import { Agent, Audit, Consent, Event, Faq, Lead, LegalVersion, Post, Property, SecurityBlock, Setting, Testimonial, User, Visit } from '../models/index.js'
import { badRequest, notFound } from '../lib/errors.js'
import { audit, contentChanged, rebuildNow, rebuildStatus } from '../lib/misc.js'
import { listQuery, parse, settingBody } from '../lib/schemas.js'
import { escapeRegex } from '../lib/security.js'
import { out, paginate } from '../lib/serialize.js'
import { config } from '../config.js'
import { whatsappSend } from '../lib/notify.js'
import { sendMetaLeadEvent } from '../lib/metaCapi.js'
import { maskPhone } from '../lib/phone.js'
import { SETTING_KEYS, adminSettings, getSetting, saveSetting } from '../services/settings.js'

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

/**
 * Sends both lead messages once to the signed-in admin's own number, so a wrong template name, a template Meta has not
 * approved yet, an expired token or a recipient that is not allowed shows up here — with Meta's own explanation —
 * instead of leads silently going out without a notification.
 */
router.post('/settings/whatsapp/test', async (req, res) => {
  const wa = await getSetting('whatsapp')
  const phone = String(req.user.phone ?? '').replace(/\D/g, '').slice(-10)
  const callNumber = String(wa.displayPhone ?? '').replace(/\D/g, '').slice(-10)
  const results = []
  for (const [label, template, params] of [
    ['Lead notification (to the team)', wa.leadNotificationTemplate, ['Test Lead', '9999999999', `A test property - ${config.siteUrl}/property/test`, '₹50 Lakh - ₹1 Crore', 'Gurugram']],
    ['Thank-you message (to the visitor)', wa.leadThankYouTemplate, ['Test', 'a test property', callNumber ? `+91 ${callNumber}` : 'our team']],
  ]) {
    const r = await whatsappSend(phone, template, params)
    results.push({ label, template, ok: r.ok, error: r.error ?? '' })
  }
  audit(req, 'test-whatsapp', 'setting', 'whatsapp')
  res.json({ to: maskPhone(phone), results })
})

/**
 * Sends one test "Lead" event to Meta using the signed-in admin's own (hashed) phone number, so a
 * wrong Pixel ID, an expired/invalid access token, or a permissions problem shows up here — with
 * Meta's own error — instead of every real lead silently failing to report. Check it landed in
 * Meta Events Manager → Test Events (paste the admin's Test Event Code into Marketing & Ad Tracking
 * first, then remove it once confirmed working).
 */
router.post('/settings/meta-capi/test', async (req, res) => {
  const result = await sendMetaLeadEvent({
    eventId: `test-${Date.now()}`,
    phone: req.user.phone,
    name: req.user.name,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    sourceUrl: config.siteUrl,
    contentName: 'Test event from Admin Settings',
  })
  audit(req, 'test-meta-capi', 'setting', 'marketing')
  res.json({ to: maskPhone(req.user.phone), ok: result.ok, error: result.error ?? '' })
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

/**
 * What visitors are searching for, and how that's trending — built from `Event` (`type: 'search'`), which is
 * only ever recorded for a signed-in, consenting account (see docs/rules.md §15). It is a real sample, not
 * every search on the site: most visitors browse without signing in, and their searches never reach the
 * server by design. `signedInOnly: true` in the response says so — the admin screen must show that caveat,
 * not present this as total site traffic.
 */
router.get('/analytics/searches', async (req, res) => {
  const days = Math.min(90, Math.max(7, Number(req.query.days) || 30))
  const DAY_MS = 24 * 60 * 60 * 1000
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const since = new Date(today.getTime() - (days - 1) * DAY_MS) // start of the day `days` calendar days ago, window ends today
  const base = { type: 'search', at: { $gte: since } }
  const topField = (field, extra = {}) => Event.aggregate([
    { $match: { ...base, [field]: { $exists: true, $ne: '' }, ...extra } },
    { $group: { _id: `$${field}`, n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: 8 },
  ])

  const [total, byCity, byType, byPurpose, topQueries, trendRaw] = await Promise.all([
    Event.countDocuments(base),
    topField('data.city'),
    topField('data.type'),
    topField('data.purpose'),
    Event.aggregate([
      { $match: { ...base, 'data.q': { $exists: true, $ne: '' } } },
      { $group: { _id: { $toLower: { $trim: { input: '$data.q' } } }, n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 10 },
    ]),
    Event.aggregate([
      { $match: base },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$at' } }, n: { $sum: 1 } } },
    ]),
  ])

  // Every day in the window gets an entry, even with zero searches — a real gap, not a missing bar.
  const trendMap = new Map(trendRaw.map((r) => [r._id, r.n]))
  const trend = []
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * DAY_MS).toISOString().slice(0, 10)
    trend.push({ date: d, count: trendMap.get(d) ?? 0 })
  }

  res.json({
    days,
    signedInOnly: true,
    totalSearches: total,
    byCity: byCity.map((r) => ({ label: r._id, count: r.n })),
    byType: byType.map((r) => ({ label: r._id, count: r.n })),
    byPurpose: byPurpose.map((r) => ({ label: r._id, count: r.n })),
    topQueries: topQueries.map((r) => ({ q: r._id, count: r.n })),
    trend,
  })
})

/**
 * Real-visitor log: one row per ip per calendar day, with best-effort city/region/pincode
 * (`lib/geo.js`). Separate from Search Analytics above — this is anonymous, IP-level traffic (never
 * linked to an account), the same source the public footer counter reads. `q` searches ip/city/
 * region/pincode/country.
 */
router.get('/visitors', async (req, res) => {
  const q = parse(listQuery, req.query)
  const filter = {}
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i')
    filter.$or = [{ ip: rx }, { city: rx }, { region: rx }, { pincode: rx }, { country: rx }, { path: rx }]
  }
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [items, total, allTime, last7Days, byCity] = await Promise.all([
    Visit.find(filter).sort({ updatedAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Visit.countDocuments(filter),
    Visit.estimatedDocumentCount(),
    Visit.countDocuments({ createdAt: { $gte: since7 } }),
    Visit.aggregate([{ $match: { city: { $ne: '' } } }, { $group: { _id: '$city', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 8 }]),
  ])
  res.json({
    items: out(items),
    allTime,
    last7Days,
    byCity: byCity.map((r) => ({ label: r._id, count: r.n })),
    ...paginate(total, q.page, q.limit),
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

/**
 * Blocked IPs / phone numbers (the escalating ladder in `lib/security-block.js`): currently-blocked first, then
 * the most recently active. `q` searches the raw ip/phone.
 */
router.get('/security/blocks', async (req, res) => {
  const q = parse(listQuery, req.query)
  const filter = q.q ? { value: new RegExp(escapeRegex(q.q)) } : {}
  const [items, total] = await Promise.all([
    SecurityBlock.find(filter).sort({ permanent: -1, blockedUntil: -1, lastOffenseAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    SecurityBlock.countDocuments(filter),
  ])
  res.json({ items: out(items), ...paginate(total, q.page, q.limit) })
})

/** Clears a block immediately (a shared/office IP, a number that turned out to be a real person, …). */
router.post('/security/blocks/:id/unblock', async (req, res) => {
  const doc = await SecurityBlock.findById(req.params.id)
  if (!doc) throw notFound('Not found.')
  doc.set({ strikes: 0, blockedUntil: null, permanent: false, unblockedBy: req.user.id, unblockedAt: new Date() })
  await doc.save()
  audit(req, 'unblock-security', 'security_block', doc.id, { kind: doc.kind })
  res.json({ ok: true, item: out(doc) })
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
