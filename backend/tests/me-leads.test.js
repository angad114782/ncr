import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ADMIN_PHONE, startTestApp } from './helpers.js'

describe('signed-in user: saved homes, events, data rights', () => {
  let t, riya
  before(async () => {
    t = await startTestApp()
    riya = await t.register({
      phone: '9777700001', name: 'Riya Sharma',
      profile: { visits: 1, views: [{ id: 'p1', city: 'Mumbai', type: 'Apartment', beds: 3, purpose: 'Buy', price: 21500000 }], searches: [], saves: [], compares: [] },
    })
  })
  after(async () => { await t.stop() })

  it('everything here needs a session', async () => {
    for (const [m, p] of [['get', '/api/me/saved'], ['get', '/api/me/data'], ['post', '/api/me/events'], ['delete', '/api/me'], ['get', '/api/me/inquiries']]) {
      assert.equal((await t.request[m](p)).status, 401, `${m} ${p}`)
    }
  })

  it('profile: edit name / city / e-mail, but not role or phone', async () => {
    const res = await riya.patch('/api/me').send({ name: 'Riya S.', city: 'Pune', email: 'RIYA@Example.com', role: 'admin', phone: '9000000000' })
    assert.equal(res.status, 200)
    assert.equal(res.body.user.name, 'Riya S.')
    assert.equal(res.body.user.email, 'riya@example.com')
    assert.equal(res.body.user.role, 'user')
    assert.equal(res.body.user.phone, '9777700001')
  })

  it('saved homes: add, list, remove, merge from the browser; only public listings are returned', async () => {
    assert.equal((await riya.post('/api/me/saved/p1')).status, 201)
    assert.equal((await riya.post('/api/me/saved/p1')).status, 201, 'saving twice is fine')
    assert.equal((await riya.post('/api/me/saved/nope')).status, 404)
    await riya.put('/api/me/saved').send({ ids: ['p2', 'p3', 'ghost'] })
    const list = (await riya.get('/api/me/saved')).body
    assert.deepEqual([...list.ids].sort(), ['p1', 'p2', 'p3'])
    assert.equal(list.items.length, 3)
    await riya.delete('/api/me/saved/p2')
    assert.equal((await riya.get('/api/me/saved')).body.ids.includes('p2'), false)
  })

  it('events are stored for the signed-in person (validated, capped)', async () => {
    const ok = await riya.post('/api/me/events').send({ events: [{ type: 'view', data: { id: 'p1', city: 'Mumbai' } }, { type: 'search', data: { city: 'Mumbai', q: 'bandra' }, at: Date.now() }] })
    assert.equal(ok.status, 201)
    assert.equal(ok.body.stored, 2)
    assert.equal((await riya.post('/api/me/events').send({ events: [{ type: 'hack', data: {} }] })).status, 400)
    assert.equal((await riya.post('/api/me/events').send({ events: [] })).status, 400)
  })

  it('my enquiries: shows mine, hides the team\'s internal scoring', async () => {
    await riya.post('/api/leads').send({ name: 'Riya Sharma', phone: '9777700001', propertyId: 'p2', message: 'Is it available?' })
    const items = (await riya.get('/api/me/inquiries')).body.items
    assert.ok(items.length >= 2, 'the sign-up lead and the enquiry')
    for (const l of items) {
      assert.equal('interest' in l, false)
      assert.equal('notes' in l, false)
    }
  })

  it('export: returns everything held about the person', async () => {
    const data = (await riya.get('/api/me/data')).body
    assert.equal(data.user.phone, '9777700001')
    assert.ok(data.leads.length >= 2)
    assert.ok(data.consents.length >= 2)
    assert.ok(data.savedProperties.length >= 2)
    assert.equal(data.events.length, 2)
  })

  it('withdrawing consent marks every consent and lead', async () => {
    const res = await riya.post('/api/me/withdraw-consent')
    assert.equal(res.body.ok, true)
    assert.ok(res.body.consentsWithdrawn >= 2)
    const { Lead, Consent } = await import('../src/models/index.js')
    assert.equal(await Lead.countDocuments({ phone: '9777700001', consent: true }), 0)
    assert.equal(await Consent.countDocuments({ phone: '9777700001', withdrawnAt: { $exists: false } }), 0)
  })

  it('erasure: needs confirm, removes the account and anonymises the person\'s data, ends the session', async () => {
    assert.equal((await riya.delete('/api/me').send({})).status, 400)
    const { Lead, Consent, User, Saved, Event } = await import('../src/models/index.js')
    const res = await riya.delete('/api/me').send({ confirm: true })
    assert.equal(res.status, 200)
    assert.equal(await User.countDocuments({ phone: '9777700001' }), 0)
    assert.equal(await Saved.countDocuments({}), 0)
    assert.equal(await Event.countDocuments({}), 0)
    const leads = await Lead.find({ userName: 'Deleted user' })
    assert.ok(leads.length >= 2)
    assert.ok(leads.every((l) => l.phone.startsWith('deleted-') && l.interest === null && l.userEmail === ''))
    assert.equal(await Consent.countDocuments({ phone: '9777700001' }), 0, 'the number is no longer stored in clear text')
    assert.equal((await riya.get('/api/auth/me')).status, 401)
    // the same number can register again afterwards
    const { Otp } = await import('../src/models/index.js')
    await Otp.deleteMany({ phone: '9777700001' })
    const again = await t.request.post('/api/auth/otp/send').send({ phone: '9777700001', purpose: 'register' })
    assert.equal(again.status, 200)
  })

  it('the last admin cannot erase their own account', async () => {
    const admin = await t.login(ADMIN_PHONE)
    const res = await admin.delete('/api/me').send({ confirm: true })
    assert.equal(res.status, 409)
  })
})

describe('leads (public enquiries)', () => {
  let t
  before(async () => { t = await startTestApp() })
  after(async () => { await t.stop() })

  it('an enquiry needs a name and a valid number, and a property that exists', async () => {
    assert.equal((await t.request.post('/api/leads').send({ name: 'A', phone: '9888800001' })).status, 400)
    assert.equal((await t.request.post('/api/leads').send({ name: 'Ann', phone: '123' })).status, 400)
    assert.equal((await t.request.post('/api/leads').send({ name: 'Ann', phone: '9888800001', propertyId: 'ghost' })).status, 400)
    assert.equal((await t.request.post('/api/leads').send({ name: 'Ann', phone: '9888800001', source: 'signup' })).status, 400, 'a visitor cannot claim the sign-up source')
  })

  it('creates a lead: assigned to the listing agent, at least Warm, consent proof stored, unverified without a token', async () => {
    const { Lead, Consent } = await import('../src/models/index.js')
    const res = await t.request.post('/api/leads').set('User-Agent', 'TestBrowser/1').send({ name: 'Vikram', phone: '+91 98888 00002', propertyId: 'p1', budget: '₹2 Cr', message: 'Site visit please', source: 'property_lead_form' })
    assert.equal(res.status, 201)
    const lead = await Lead.findById(res.body.id)
    assert.equal(lead.phone, '9888800002')
    assert.equal(lead.propertyId, 'p1')
    assert.equal(lead.assignedAgentId, 'a1', 'the agent of that listing follows up')
    assert.equal(lead.intent, 'Warm')
    assert.equal(lead.phoneVerified, false)
    const consent = await Consent.findById(lead.consentId)
    assert.equal(consent.kind, 'enquiry')
    assert.equal(consent.userAgent, 'TestBrowser/1')
    assert.ok(consent.text.length > 10)
  })

  it('the same person asking about the same property again is merged, not duplicated', async () => {
    const { Lead } = await import('../src/models/index.js')
    await t.request.post('/api/leads').send({ name: 'Vikram', phone: '9888800002', propertyId: 'p1', message: 'Any update?' })
    const leads = await Lead.find({ phone: '9888800002', propertyId: 'p1' })
    assert.equal(leads.length, 1)
    assert.match(leads[0].message, /Any update\?/)
    assert.match(leads[0].message, /Site visit please/)
    await t.request.post('/api/leads').send({ name: 'Vikram', phone: '9888800002', propertyId: 'p2', message: 'Different home' })
    assert.equal(await Lead.countDocuments({ phone: '9888800002' }), 2)
  })

  it('a contact-page enquiry without a property works and keeps the contact form\'s intent', async () => {
    const { Lead } = await import('../src/models/index.js')
    const res = await t.request.post('/api/leads').send({ name: 'Sunita', phone: '9888800003', email: 'sunita@example.com', message: 'I want to list my flat', contactIntent: 'sell', city: 'Delhi' })
    assert.equal(res.status, 201)
    const lead = await Lead.findById(res.body.id)
    assert.equal(lead.contactIntent, 'sell')
    assert.equal(lead.city, 'Delhi')
    assert.equal(lead.userEmail, 'sunita@example.com')
  })

  it('a hot browsing profile makes an enquiry Hot; a client cannot send an intent directly', async () => {
    const { Lead } = await import('../src/models/index.js')
    const views = Array.from({ length: 6 }, (_, i) => ({ id: `p${i + 1}`, city: 'Mumbai', type: 'Apartment', beds: 3, purpose: 'Buy', price: 20000000 }))
    const res = await t.request.post('/api/leads').send({ name: 'Hot Lead', phone: '9888800004', propertyId: 'p1', intent: 'Cold', profile: { visits: 3, views, searches: [{ city: 'Mumbai', purpose: 'Buy' }, { city: 'Mumbai', purpose: 'Buy', beds: '3' }], saves: [{ id: 'p1', city: 'Mumbai' }], compares: [] } })
    assert.equal((await Lead.findById(res.body.id)).intent, 'Hot')
  })
})
