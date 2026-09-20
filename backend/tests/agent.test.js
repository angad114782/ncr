import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ADMIN_PHONE, startTestApp } from './helpers.js'

const listing = (over = {}) => ({ title: 'Agent Posted 3BHK Flat', purpose: 'Buy', type: 'Apartment', city: 'Gurugram', locality: 'Sector 56', price: 9500000, beds: 3, ...over })

describe('agents: registration, own listings, moderation', () => {
  let t, admin, rohit, meera
  before(async () => {
    t = await startTestApp()
    admin = await t.login(ADMIN_PHONE)
    rohit = await t.register({ phone: '9222200001', name: 'Rohit Verma', role: 'agent', city: 'Gurugram' })
    meera = await t.register({ phone: '9222200002', name: 'Meera Kapoor', role: 'agent', city: 'Pune' })
  })
  after(async () => { await t.stop() })

  it('a client cannot use the agent API, an agent cannot use the admin API', async () => {
    const client = await t.register({ phone: '9222200003', name: 'Just A Client' })
    assert.equal((await client.get('/api/agent/properties')).status, 403)
    assert.equal((await rohit.get('/api/admin/stats')).status, 403)
    assert.equal((await t.request.get('/api/agent/stats')).status, 401)
  })

  it('a new listing is pending + hidden + stamped with the agent — whatever the agent tries to send', async () => {
    const res = await rohit.post('/api/agent/properties').send(listing({
      // everything an agent must NOT be able to control:
      featured: true, verified: true, active: true, reviewStatus: 'approved', agentId: 'a1', submittedBy: 'someone-else', slug: 'my-own-slug', postedDate: '2001-01-01',
    }))
    assert.equal(res.status, 201)
    const p = res.body.property
    assert.equal(p.reviewStatus, 'pending')
    assert.equal(p.active, false)
    assert.equal(p.featured, false)
    assert.equal(p.verified, false)
    assert.equal(p.agentId, rohit.registered.agent.id)
    assert.equal(p.submittedBy, rohit.registered.user.id)
    assert.equal(p.slug, 'agent-posted-3bhk-flat', 'the slug is generated from the title, not chosen by the agent')
    assert.notEqual(p.postedDate, '2001-01-01')
    assert.equal(p.priceLabel, '₹95 L')
  })

  it('it is not public, and the agent sees only their own listings', async () => {
    assert.equal((await t.request.get('/api/properties?q=Agent Posted')).body.items.length, 0)
    assert.equal((await t.request.get('/api/properties/agent-posted-3bhk-flat')).status, 404)
    await meera.post('/api/agent/properties').send(listing({ title: 'Meera Pune Home', city: 'Pune' }))
    const mine = await rohit.get('/api/agent/properties')
    assert.deepEqual(mine.body.items.map((p) => p.title), ['Agent Posted 3BHK Flat'])
  })

  it('an agent cannot read, edit, toggle or delete another agent\'s listing', async () => {
    const theirs = (await meera.get('/api/agent/properties')).body.items[0]
    assert.equal((await rohit.get(`/api/agent/properties/${theirs.id}`)).status, 404)
    assert.equal((await rohit.patch(`/api/agent/properties/${theirs.id}`).send({ title: 'Hijacked title' })).status, 404)
    assert.equal((await rohit.patch(`/api/agent/properties/${theirs.id}/active`).send({ active: true })).status, 404)
    assert.equal((await rohit.delete(`/api/agent/properties/${theirs.id}`)).status, 404)
    // and not somebody else's seed listing either
    assert.equal((await rohit.patch('/api/agent/properties/p1').send({ title: 'Hijacked' })).status, 404)
  })

  it('an agent cannot switch a pending listing on', async () => {
    const mine = (await rohit.get('/api/agent/properties')).body.items[0]
    const res = await rohit.patch(`/api/agent/properties/${mine.id}/active`).send({ active: true })
    assert.equal(res.status, 409)
    assert.equal(res.body.error.code, 'not_approved')
  })

  it('same-title listings get distinct URLs (city / locality added)', async () => {
    const a = await rohit.post('/api/agent/properties').send(listing({ title: 'Twin Flat', locality: 'Sector 1' }))
    const b = await rohit.post('/api/agent/properties').send(listing({ title: 'Twin Flat', locality: 'Sector 2' }))
    const c = await rohit.post('/api/agent/properties').send(listing({ title: 'Twin Flat', locality: 'Sector 1' }))
    const slugs = [a, b, c].map((r) => r.body.property.slug)
    assert.equal(new Set(slugs).size, 3, slugs.join(' | '))
    assert.equal(slugs[0], 'twin-flat')
    assert.equal(slugs[1], 'twin-flat-gurugram')
  })

  it('CSV-style import makes pending listings with unique slugs', async () => {
    const res = await rohit.post('/api/agent/properties/import').send({ items: [listing({ title: 'Bulk Home' }), listing({ title: 'Bulk Home' }), listing({ title: 'Bulk Home', active: true, featured: true })] })
    assert.equal(res.status, 201)
    assert.equal(res.body.added, 3)
    assert.equal(new Set(res.body.items.map((p) => p.slug)).size, 3)
    assert.ok(res.body.items.every((p) => p.reviewStatus === 'pending' && p.active === false && p.featured === false))
  })

  it('images must be links (or uploaded files), not data URLs', async () => {
    const res = await rohit.post('/api/agent/properties').send(listing({ title: 'Data URL Home', images: ['data:image/png;base64,AAAA'] }))
    assert.equal(res.status, 400)
    assert.equal(res.body.error.code, 'validation_error')
  })

  it('the admin cannot approve while the agent is unapproved; approving the agent then the listing makes it public', async () => {
    const mine = (await rohit.get('/api/agent/properties')).body.items.find((p) => p.title === 'Agent Posted 3BHK Flat')
    const blocked = await admin.post(`/api/admin/properties/${mine.id}/approve`)
    assert.equal(blocked.status, 400)
    assert.match(blocked.body.error.message, /Approve the agent/)

    assert.equal((await admin.patch(`/api/admin/agents/${rohit.registered.agent.id}`).send({ status: 'approved' })).status, 200)
    const ok = await admin.post(`/api/admin/properties/${mine.id}/approve`)
    assert.equal(ok.status, 200)
    assert.equal(ok.body.property.reviewStatus, 'approved')
    assert.equal(ok.body.property.active, true)

    const pub = await t.request.get('/api/properties/agent-posted-3bhk-flat')
    assert.equal(pub.status, 200)
    assert.equal(pub.body.agent.name, 'Rohit Verma', 'the approved agent is shown on the listing')
    assert.equal((await t.request.get('/api/agents/' + rohit.registered.agent.id)).status, 200)
  })

  it('an approved listing can be hidden and shown by its agent; edits keep the approval and cannot self-feature', async () => {
    const mine = (await rohit.get('/api/agent/properties')).body.items.find((p) => p.title === 'Agent Posted 3BHK Flat')
    assert.equal((await rohit.patch(`/api/agent/properties/${mine.id}/active`).send({ active: false })).body.property.active, false)
    assert.equal((await t.request.get('/api/properties/agent-posted-3bhk-flat')).status, 410)
    assert.equal((await rohit.patch(`/api/agent/properties/${mine.id}/active`).send({ active: true })).body.property.active, true)

    const edit = await rohit.patch(`/api/agent/properties/${mine.id}`).send({ price: 9900000, featured: true, verified: true, reviewStatus: 'pending', active: false, agentId: 'a1' })
    assert.equal(edit.status, 200)
    assert.equal(edit.body.property.price, 9900000)
    assert.equal(edit.body.property.reviewStatus, 'approved')
    assert.equal(edit.body.property.active, true)
    assert.equal(edit.body.property.featured, false)
    assert.equal(edit.body.property.agentId, rohit.registered.agent.id)
    assert.equal(edit.body.property.slug, 'agent-posted-3bhk-flat', 'the URL does not change when a listing is edited')
  })

  it('rejecting sends it back; editing a rejected listing resubmits it', async () => {
    const meeras = (await meera.get('/api/agent/properties')).body.items[0]
    const rej = await admin.post(`/api/admin/properties/${meeras.id}/reject`).send({ note: 'Photos missing' })
    assert.equal(rej.body.property.reviewStatus, 'rejected')
    assert.equal((await meera.get('/api/agent/properties')).body.items[0].reviewNote, 'Photos missing')
    const fixed = await meera.patch(`/api/agent/properties/${meeras.id}`).send({ description: 'Now with photos' })
    assert.equal(fixed.body.property.reviewStatus, 'pending')
    assert.equal(fixed.body.property.reviewNote, '')
  })

  it('agent stats count listings by state', async () => {
    const stats = (await rohit.get('/api/agent/stats')).body
    assert.equal(stats.status, 'approved')
    assert.equal(stats.live, 1)
    assert.ok(stats.pending >= 5)
  })

  it('an agent only sees enquiries on their own listings, without the sales scoring', async () => {
    const { Lead } = await import('../src/models/index.js')
    const mine = (await rohit.get('/api/agent/properties')).body.items.find((p) => p.title === 'Agent Posted 3BHK Flat')
    await t.request.post('/api/leads').send({ name: 'Buyer One', phone: '9333300001', propertyId: mine.id, message: 'Available?' })
    await t.request.post('/api/leads').send({ name: 'Buyer Two', phone: '9333300002', propertyId: 'p1', message: 'Other property' })
    const leads = await rohit.get('/api/agent/leads')
    assert.deepEqual(leads.body.items.map((l) => l.userName), ['Buyer One'])
    assert.equal('intent' in leads.body.items[0], false)
    assert.equal('interest' in leads.body.items[0], false)

    assert.equal((await rohit.patch(`/api/agent/leads/${leads.body.items[0].id}`).send({ status: 'Responded' })).status, 200)
    const other = await Lead.findOne({ userName: 'Buyer Two' })
    assert.equal((await rohit.patch(`/api/agent/leads/${other.id}`).send({ status: 'Responded' })).status, 404)
  })

  it('an agent edits their public profile but not their approval status or rating', async () => {
    const res = await rohit.patch('/api/agent/profile').send({ bio: 'Ten years in Gurugram.', agency: 'Verma Realty', status: 'approved', rating: 5, dealsClosed: 999 })
    assert.equal(res.status, 200)
    assert.equal(res.body.agent.bio, 'Ten years in Gurugram.')
    assert.equal(res.body.agent.rating, 0)
    assert.equal(res.body.agent.dealsClosed, 0)
    const m = await meera.patch('/api/agent/profile').send({ status: 'approved' })
    assert.equal(m.body.agent.status, 'pending')
  })

  it('a rejected agent cannot post and their live listings disappear', async () => {
    await admin.patch(`/api/admin/agents/${rohit.registered.agent.id}`).send({ status: 'rejected' })
    assert.equal((await t.request.get('/api/properties/agent-posted-3bhk-flat')).status, 410)
    assert.equal((await rohit.post('/api/agent/properties').send(listing({ title: 'Should Fail' }))).status, 403)
    assert.equal((await t.request.get('/api/agents/' + rohit.registered.agent.id)).status, 404)
  })
})
