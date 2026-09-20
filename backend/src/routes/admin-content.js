import { Router } from 'express'
import { z } from 'zod'
import { Agent, Faq, Lead, Post, Property, Testimonial, User } from '../models/index.js'
import { AppError, conflict, notFound } from '../lib/errors.js'
import { newId } from '../lib/ids.js'
import { audit, contentChanged } from '../lib/misc.js'
import { notifyPerson } from '../lib/notify.js'
import { slugify } from '../lib/propertySlug.js'
import { agentAdmin, bulkBody, faqInput, leadPatch, leadQuery, listQuery, parse, postInput, testimonialInput, userCreate, userUpdate } from '../lib/schemas.js'
import { escapeRegex } from '../lib/security.js'
import { out, paginate } from '../lib/serialize.js'

const today = () => new Date().toISOString().slice(0, 10)

/**
 * The same admin operations for every managed collection: list (search / active filter / pages), get,
 * create, update, delete, bulk activate / deactivate / delete. Entity rules go in the hooks.
 */
function crud({ Model, name, prefix, create, update, search = [], sort = { createdAt: -1 }, before, after, publicChange = true }) {
  const router = Router()
  const changed = (what) => publicChange && contentChanged(`${name}-${what}`)

  router.get('/', async (req, res) => {
    const q = parse(listQuery, req.query)
    const filter = {}
    if (q.active) filter.active = q.active === 'true' ? { $ne: false } : false
    if (q.q && search.length) {
      const rx = new RegExp(escapeRegex(q.q), 'i')
      filter.$or = search.map((f) => ({ [f]: rx }))
    }
    const [items, total, active] = await Promise.all([
      Model.find(filter).sort(sort).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
      Model.countDocuments(filter),
      Model.countDocuments({ active: { $ne: false } }),
    ])
    res.json({ items: out(items), activeCount: active, ...paginate(total, q.page, q.limit) })
  })

  router.get('/:id', async (req, res) => {
    const doc = await Model.findById(req.params.id)
    if (!doc) throw notFound(`${name} not found.`)
    res.json({ item: out(doc) })
  })

  router.post('/', async (req, res) => {
    let data = parse(create ?? update, req.body)
    if (before) data = await before(data, null, req)
    const doc = await Model.create({ _id: newId(prefix), ...data })
    if (after) await after(doc, null, req)
    audit(req, `create-${name}`, name, doc.id)
    changed('created')
    res.status(201).json({ item: out(doc) })
  })

  router.patch('/:id', async (req, res) => {
    const doc = await Model.findById(req.params.id)
    if (!doc) throw notFound(`${name} not found.`)
    const previous = doc.toObject()
    let data = parse(update, req.body)
    if (before) data = await before(data, doc, req)
    doc.set(data)
    await doc.save()
    if (after) await after(doc, previous, req)
    audit(req, `update-${name}`, name, doc.id)
    changed('updated')
    res.json({ item: out(doc) })
  })

  router.delete('/:id', async (req, res) => {
    const doc = await Model.findById(req.params.id)
    if (!doc) throw notFound(`${name} not found.`)
    if (before?.onDelete) await before.onDelete(doc, req)
    await doc.deleteOne()
    audit(req, `delete-${name}`, name, doc.id)
    changed('deleted')
    res.json({ ok: true })
  })

  router.post('/bulk/action', async (req, res) => {
    const { ids, action } = parse(bulkBody, req.body)
    if (action === 'delete') await Model.deleteMany({ _id: { $in: ids } })
    else if (action === 'activate' || action === 'deactivate') await Model.updateMany({ _id: { $in: ids } }, { active: action === 'activate' })
    else throw new AppError(400, 'bad_request', `Action "${action}" is not available here.`)
    audit(req, `bulk-${action}`, name, '', { count: ids.length })
    changed('bulk')
    res.json({ ok: true, count: ids.length })
  })

  /** Upsert many (CSV import). Rows with an existing id update it; others are added. */
  router.post('/import/rows', async (req, res) => {
    const { items } = parse(z.object({ items: z.array(update.extend({ id: z.string().max(60).optional() })).min(1).max(1000) }), req.body)
    let added = 0
    let updated = 0
    for (const item of items) {
      const { id, ...data } = item
      const existing = id ? await Model.findById(id) : null
      const payload = before ? await before(data, existing, req) : data
      if (existing) {
        existing.set(payload)
        await existing.save()
        updated++
      } else {
        await Model.create({ _id: id || newId(prefix), ...payload })
        added++
      }
    }
    audit(req, `import-${name}`, name, '', { added, updated })
    changed('import')
    res.status(201).json({ added, updated })
  })

  /** Manual order (FAQs, reviews): the list of ids in the wanted order. */
  router.post('/reorder', async (req, res) => {
    const { ids } = parse(z.object({ ids: z.array(z.string().max(60)).min(1).max(1000) }), req.body)
    await Promise.all(ids.map((id, i) => Model.updateOne({ _id: id }, { order: i })))
    changed('reordered')
    res.json({ ok: true })
  })

  return router
}

/* ------------------------------------------------------------------- blog */
async function uniquePostSlug(base, selfId) {
  const root = slugify(base) || 'post'
  for (let n = 1; n < 200; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`
    if (!(await Post.exists({ slug: candidate, _id: { $ne: selfId } }))) return candidate
  }
  return `${root}-${Date.now().toString(36)}`
}

export const blog = crud({
  Model: Post,
  name: 'post',
  prefix: 'b',
  create: postInput.required({ title: true }),
  update: postInput,
  search: ['title', 'slug', 'category', 'description'],
  sort: { date: -1, createdAt: -1 },
  before: async (data, existing) => {
    const wanted = data.slug !== undefined ? data.slug : existing?.slug
    const slug = wanted ? slugify(wanted) : slugify(data.title ?? existing?.title ?? '')
    const taken = slug && (await Post.exists({ slug, _id: { $ne: existing?.id } }))
    if (taken && data.slug) throw conflict(`Another post already uses the URL “${slug}”. Change the slug.`, 'slug_taken')
    return { ...data, slug: taken ? await uniquePostSlug(slug, existing?.id) : slug || (await uniquePostSlug(data.title ?? 'post', existing?.id)), date: data.date || existing?.date || today(), updated: today() }
  },
})

/* ------------------------------------------------------ faqs, testimonials */
export const faqs = crud({ Model: Faq, name: 'faq', prefix: 'f', create: faqInput.required({ question: true, answer: true }), update: faqInput, search: ['question', 'answer', 'category'], sort: { order: 1, createdAt: 1 } })
export const testimonials = crud({ Model: Testimonial, name: 'testimonial', prefix: 't', create: testimonialInput.required({ name: true, text: true }), update: testimonialInput, search: ['name', 'text', 'city'], sort: { order: 1, createdAt: 1 } })

/* ----------------------------------------------------------------- agents */
async function hideRejectedAgentListings(agent) {
  // a rejected or switched-off agent must not keep listings (and their contact details) on the public site
  if (agent.status === 'rejected' || agent.active === false) await Property.updateMany({ agentId: agent.id }, { active: false })
}

export const agents = crud({
  Model: Agent,
  name: 'agent',
  prefix: 'a',
  create: agentAdmin.required({ name: true }),
  update: agentAdmin,
  search: ['name', 'city', 'email', 'phone', 'agency'],
  sort: { createdAt: -1 },
  after: async (agent, previous) => {
    if (previous && previous.status !== agent.status) {
      const text = agent.status === 'approved' ? 'Your agent profile was approved — you can now post listings.' : agent.status === 'rejected' ? 'Your agent registration was not approved. Please contact us to know more.' : ''
      if (text) notifyPerson({ phone: agent.phone, email: agent.email }, 'Your agent account', text).catch(() => {})
    }
    await hideRejectedAgentListings(agent)
  },
})

/* ------------------------------------------------------------------ users */
async function lastAdminGuard(user, patch) {
  const losing = user.role === 'admin' && ((patch.role && patch.role !== 'admin') || patch.active === false)
  if (losing && (await User.countDocuments({ role: 'admin', active: { $ne: false } })) <= 1) throw conflict('At least one active admin is required.', 'last_admin')
}

export const users = Router()

users.get('/', async (req, res) => {
  const q = parse(listQuery.extend({ role: z.enum(['user', 'agent', 'admin']).optional() }), req.query)
  const filter = { ...(q.role ? { role: q.role } : {}) }
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i')
    filter.$or = [{ name: rx }, { phone: rx }, { city: rx }]
  }
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    User.countDocuments(filter),
  ])
  res.json({ items: out(items), ...paginate(total, q.page, q.limit) })
})

users.post('/', async (req, res) => {
  const d = parse(userCreate, req.body)
  if (await User.exists({ phone: d.phone })) throw conflict('This number is already linked to another account.', 'phone_taken')
  const id = newId('u')
  const user = await User.create({ _id: id, ...d, agentId: d.role === 'agent' ? `a${id}` : undefined })
  if (user.role === 'agent') await Agent.create({ _id: user.agentId, userId: user.id, name: user.name, city: user.city, phone: `+91 ${user.phone}`, status: 'pending', joined: today() })
  audit(req, 'create-user', 'user', user.id, { role: user.role })
  res.status(201).json({ item: out(user) })
})

users.patch('/:id', async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) throw notFound('User not found.')
  const d = parse(userUpdate, req.body)
  if (d.phone && d.phone !== user.phone && (await User.exists({ phone: d.phone, _id: { $ne: user.id } }))) throw conflict('This number is already linked to another account.', 'phone_taken')
  await lastAdminGuard(user, d)
  user.set(d)
  if (user.role === 'agent' && !user.agentId) {
    user.agentId = `a${user.id}`
    if (!(await Agent.exists({ userId: user.id }))) await Agent.create({ _id: user.agentId, userId: user.id, name: user.name, city: user.city, phone: `+91 ${user.phone}`, status: 'pending', joined: today() })
  }
  await user.save()
  audit(req, 'update-user', 'user', user.id, { role: user.role, active: user.active })
  res.json({ item: out(user) })
})

users.delete('/:id', async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) throw notFound('User not found.')
  if (user.id === req.user.id) throw conflict('You cannot delete the account you are signed in with.', 'self_delete')
  await lastAdminGuard(user, { active: false })
  await user.deleteOne()
  audit(req, 'delete-user', 'user', user.id)
  res.json({ ok: true })
})

/* ------------------------------------------------------------------ leads */
export const leads = Router()

const csvCell = (v) => {
  let s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}` // stop spreadsheet formulas in exported text
  return `"${s.replace(/"/g, '""')}"`
}

function leadFilter(q) {
  const f = {}
  if (q.status) f.status = q.status
  if (q.intent) f.intent = q.intent
  if (q.source) f.source = q.source
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i')
    f.$or = [{ userName: rx }, { phone: rx }, { userEmail: rx }, { message: rx }, { city: rx }]
  }
  return f
}

leads.get('/', async (req, res) => {
  const q = parse(leadQuery, req.query)
  const filter = leadFilter(q)
  const [items, total, hot] = await Promise.all([
    Lead.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Lead.countDocuments(filter),
    Lead.countDocuments({ intent: 'Hot', status: 'Pending' }),
  ])
  res.json({ items: out(items), hotPending: hot, ...paginate(total, q.page, q.limit) })
})

leads.get('/export.csv', async (req, res) => {
  const rows = await Lead.find(leadFilter(parse(leadQuery, req.query))).sort({ createdAt: -1 }).limit(20000).lean()
  const props = new Map((await Property.find({ _id: { $in: rows.map((r) => r.propertyId).filter(Boolean) } }, 'title').lean()).map((p) => [p._id, p.title]))
  const cols = ['id', 'date', 'status', 'intent', 'source', 'propertyId', 'propertyTitle', 'userName', 'userEmail', 'phone', 'phoneVerified', 'budget', 'city', 'consent', 'interest', 'assignedAgentId', 'message']
  const lines = [cols.join(',')]
  for (const r of rows) {
    lines.push([r._id, r.date, r.status, r.intent, r.source, r.propertyId, props.get(r.propertyId), r.userName, r.userEmail, r.phone, r.phoneVerified, r.budget, r.city, r.consent, r.interest?.line, r.assignedAgentId, r.message].map(csvCell).join(','))
  }
  res.set('Content-Type', 'text/csv; charset=utf-8').set('Content-Disposition', `attachment; filename="leads-${today()}.csv"`).send(`﻿${lines.join('\n')}\n`)
})

leads.get('/:id', async (req, res) => {
  const lead = await Lead.findById(req.params.id)
  if (!lead) throw notFound('Lead not found.')
  res.json({ item: out(lead) })
})

leads.patch('/:id', async (req, res) => {
  const d = parse(leadPatch, req.body)
  const lead = await Lead.findById(req.params.id)
  if (!lead) throw notFound('Lead not found.')
  if (d.status) lead.status = d.status
  if (d.assignedAgentId !== undefined) {
    if (d.assignedAgentId && !(await Agent.exists({ _id: d.assignedAgentId }))) throw notFound('Agent not found.')
    lead.assignedAgentId = d.assignedAgentId
  }
  if (d.note) lead.notes.push({ text: d.note, by: req.user.name, at: new Date() })
  await lead.save()
  audit(req, 'update-lead', 'lead', lead.id, { status: lead.status })
  res.json({ item: out(lead) })
})

leads.delete('/:id', async (req, res) => {
  const lead = await Lead.findByIdAndDelete(req.params.id)
  if (!lead) throw notFound('Lead not found.')
  audit(req, 'delete-lead', 'lead', lead.id)
  res.json({ ok: true })
})
