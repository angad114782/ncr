import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ADMIN_PHONE, startTestApp } from './helpers.js'

describe('reviews (agent + property, admin-moderated like Testimonials)', () => {
  let t, admin, riya, propertyId, agentId

  before(async () => {
    t = await startTestApp()
    admin = await t.login(ADMIN_PHONE)
    riya = await t.register({ phone: '9622200001', name: 'Riya Reviewer' })
    const boot = await t.request.get('/api/public/bootstrap')
    propertyId = boot.body.properties[0].id
    agentId = boot.body.agents[0].id
  })
  after(async () => { await t.stop() })

  it('signed out cannot leave a review', async () => {
    const res = await t.request.post('/api/me/reviews').send({ targetType: 'property', targetId: propertyId, rating: 5 })
    assert.equal(res.status, 401)
  })

  it('a rating outside 1-5 is refused', async () => {
    const res = await riya.post('/api/me/reviews').send({ targetType: 'property', targetId: propertyId, rating: 0 })
    assert.equal(res.status, 400)
  })

  it('reviewing something that does not exist is a clean 404', async () => {
    const res = await riya.post('/api/me/reviews').send({ targetType: 'property', targetId: 'p-does-not-exist', rating: 5 })
    assert.equal(res.status, 404)
  })

  it('a new review starts pending and is not public yet', async () => {
    const res = await riya.post('/api/me/reviews').send({ targetType: 'property', targetId: propertyId, rating: 4, text: 'Nice place, good locality.' })
    assert.equal(res.status, 201)
    assert.equal(res.body.item.status, 'pending')
    const pub = await t.request.get(`/api/reviews?targetType=property&targetId=${propertyId}`)
    assert.equal(pub.body.items.length, 0)
    assert.equal(pub.body.average, 0)
  })

  it('a non-admin cannot see the moderation queue', async () => {
    assert.equal((await riya.get('/api/admin/reviews')).status, 403)
  })

  it('admin sees it pending, with the target resolved to a readable label', async () => {
    const res = await admin.get('/api/admin/reviews?status=pending')
    assert.equal(res.status, 200)
    assert.equal(res.body.items.length, 1)
    assert.equal(res.body.items[0].userName, 'Riya Reviewer')
    assert.ok(res.body.items[0].targetLabel)
    assert.equal(res.body.pendingReview, 1)
  })

  it('resubmitting (editing) replaces the old text/rating — still one review, still pending', async () => {
    const res = await riya.post('/api/me/reviews').send({ targetType: 'property', targetId: propertyId, rating: 5, text: 'Updated: loved it.' })
    assert.equal(res.status, 200) // update, not create
    const list = await admin.get('/api/admin/reviews')
    assert.equal(list.body.total, 1)
    assert.equal(list.body.items[0].rating, 5)
  })

  let reviewId
  it('approving makes it public and countable in the average', async () => {
    const list = await admin.get('/api/admin/reviews')
    reviewId = list.body.items[0].id
    const res = await admin.post(`/api/admin/reviews/${reviewId}/approve`)
    assert.equal(res.status, 200)
    assert.equal(res.body.item.status, 'approved')
    const pub = await t.request.get(`/api/reviews?targetType=property&targetId=${propertyId}`)
    assert.equal(pub.body.items.length, 1)
    assert.equal(pub.body.average, 5)
  })

  it('an agent cannot review their own profile, or a listing they posted themselves', async () => {
    const agentClient = await t.register({ phone: '9622200002', name: 'Amit Agent', role: 'agent', city: 'Gurugram' })
    const myAgentId = agentClient.registered.agent.id
    const selfReview = await agentClient.post('/api/me/reviews').send({ targetType: 'agent', targetId: myAgentId, rating: 5 })
    assert.equal(selfReview.status, 400)

    const listing = await agentClient.post('/api/agent/properties').send({ title: 'Test flat for review checks', purpose: 'Buy', city: 'Gurugram', price: 5000000 })
    assert.equal(listing.status, 201)
    const ownListingReview = await agentClient.post('/api/me/reviews').send({ targetType: 'property', targetId: listing.body.property.id, rating: 5 })
    assert.equal(ownListingReview.status, 400)
  })

  it('rejecting stores the note and keeps it off the public list', async () => {
    const created = await riya.post('/api/me/reviews').send({ targetType: 'agent', targetId: agentId, rating: 2, text: 'Slow to respond.' })
    const id = created.body.item.id
    const res = await admin.post(`/api/admin/reviews/${id}/reject`).send({ note: 'Asked the agent about it — a one-off, most likely.' })
    assert.equal(res.status, 200)
    assert.equal(res.body.item.status, 'rejected')
    const pub = await t.request.get(`/api/reviews?targetType=agent&targetId=${agentId}`)
    assert.equal(pub.body.items.length, 0)
  })

  it("GET /me/reviews shows all of a person's own reviews regardless of status", async () => {
    const res = await riya.get('/api/me/reviews')
    assert.equal(res.status, 200)
    assert.equal(res.body.items.length, 2) // the property one (approved) + the agent one (rejected)
  })

  it('bulk approve and bulk delete', async () => {
    const bob = await t.register({ phone: '9622200003', name: 'Bob Bulk' })
    const created = await bob.post('/api/me/reviews').send({ targetType: 'property', targetId: propertyId, rating: 3, text: 'ok' })
    const res = await admin.post('/api/admin/reviews/bulk/action').send({ ids: [created.body.item.id], action: 'approve' })
    assert.equal(res.status, 200)
    assert.equal(res.body.count, 1)
    const del = await admin.post('/api/admin/reviews/bulk/action').send({ ids: [created.body.item.id], action: 'delete' })
    assert.equal(del.status, 200)
    const { Review } = await import('../src/models/index.js')
    assert.equal(await Review.findById(created.body.item.id), null)
  })

  it('deleting an account keeps the review (rating/text) but strips the name and unlinks it', async () => {
    const charlie = await t.register({ phone: '9622200004', name: 'Charlie Erase' })
    const created = await charlie.post('/api/me/reviews').send({ targetType: 'property', targetId: propertyId, rating: 4, text: 'Decent value.' })
    await admin.post(`/api/admin/reviews/${created.body.item.id}/approve`)
    const del = await charlie.delete('/api/me').send({ confirm: true })
    assert.equal(del.status, 200)
    const { Review } = await import('../src/models/index.js')
    const review = await Review.findById(created.body.item.id).lean()
    assert.equal(review.userName, 'Deleted user')
    assert.equal(review.userId, null)
    assert.equal(review.rating, 4)
    assert.equal(review.text, 'Decent value.')
  })
})
