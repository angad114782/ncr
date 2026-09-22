import { Router } from 'express'
import { Agent, Property, Review } from '../models/index.js'
import { badRequest, notFound } from '../lib/errors.js'
import { audit, contentChanged } from '../lib/misc.js'
import { bulkBody, parse, reviewAdminQuery, reviewDecision } from '../lib/schemas.js'
import { escapeRegex } from '../lib/security.js'
import { out, paginate } from '../lib/serialize.js'

const router = Router()

/** "2 BHK in Gurugram" / an agent's name — so the admin list doesn't just show a bare targetId. */
async function labelTargets(reviews) {
  const propertyIds = [...new Set(reviews.filter((r) => r.targetType === 'property').map((r) => r.targetId))]
  const agentIds = [...new Set(reviews.filter((r) => r.targetType === 'agent').map((r) => r.targetId))]
  const [properties, agents] = await Promise.all([
    Property.find({ _id: { $in: propertyIds } }, 'title').lean(),
    Agent.find({ _id: { $in: agentIds } }, 'name').lean(),
  ])
  const byId = new Map([...properties.map((p) => [p._id, p.title]), ...agents.map((a) => [a._id, a.name])])
  return reviews.map((r) => ({ ...r, targetLabel: byId.get(r.targetId) ?? '(deleted)' }))
}

router.get('/', async (req, res) => {
  const q = parse(reviewAdminQuery, req.query)
  const filter = {}
  if (q.status) filter.status = q.status
  if (q.targetType) filter.targetType = q.targetType
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i')
    filter.$or = [{ userName: rx }, { text: rx }]
  }
  const [items, total, pending] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Review.countDocuments(filter),
    Review.countDocuments({ status: 'pending' }),
  ])
  res.json({ items: out(await labelTargets(items)), pendingReview: pending, ...paginate(total, q.page, q.limit) })
})

router.post('/:id/approve', async (req, res) => {
  const r = await Review.findById(req.params.id)
  if (!r) throw notFound('Review not found.')
  r.set({ status: 'approved', reviewNote: '' })
  await r.save()
  audit(req, 'approve-review', 'review', r.id)
  contentChanged('review-approved')
  res.json({ item: out(r) })
})

router.post('/:id/reject', async (req, res) => {
  const { note } = parse(reviewDecision, req.body)
  const r = await Review.findById(req.params.id)
  if (!r) throw notFound('Review not found.')
  r.set({ status: 'rejected', reviewNote: note ?? '' })
  await r.save()
  audit(req, 'reject-review', 'review', r.id)
  contentChanged('review-rejected')
  res.json({ item: out(r) })
})

router.delete('/:id', async (req, res) => {
  const r = await Review.findByIdAndDelete(req.params.id)
  if (!r) throw notFound('Review not found.')
  audit(req, 'delete-review', 'review', r.id)
  contentChanged('review-deleted')
  res.json({ ok: true })
})

/** approve / reject / delete many at once. */
router.post('/bulk/action', async (req, res) => {
  const { ids, action } = parse(bulkBody, req.body)
  if (action !== 'approve' && action !== 'reject' && action !== 'delete') throw badRequest(`Action "${action}" is not available here.`)
  if (action === 'delete') await Review.deleteMany({ _id: { $in: ids } })
  else await Review.updateMany({ _id: { $in: ids } }, { status: action === 'approve' ? 'approved' : 'rejected' })
  audit(req, `bulk-${action}`, 'review', '', { count: ids.length })
  contentChanged('reviews-bulk')
  res.json({ ok: true, count: ids.length })
})

export default router
