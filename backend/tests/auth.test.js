import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { ADMIN_PHONE, startTestApp } from './helpers.js'

describe('auth: OTP, login, registration', () => {
  let t
  before(async () => { t = await startTestApp() })
  after(async () => { await t.stop() })

  it('rejects a bad phone number', async () => {
    const res = await t.request.post('/api/auth/otp/send').send({ phone: '12345', purpose: 'login' })
    assert.equal(res.status, 400)
    assert.equal(res.body.error.code, 'validation_error')
  })

  it('login OTP for an unknown number says there is no account', async () => {
    const res = await t.request.post('/api/auth/otp/send').send({ phone: '9000000099', purpose: 'login' })
    assert.equal(res.status, 404)
  })

  it('sends an OTP (dev mode returns it), cools down, and accepts +91 formatting', async () => {
    const first = await t.request.post('/api/auth/otp/send').send({ phone: '+91 98200 11122', purpose: 'login' })
    assert.equal(first.status, 200)
    assert.match(first.body.devOtp, /^\d{6}$/)
    const again = await t.request.post('/api/auth/otp/send').send({ phone: '9820011122', purpose: 'login' })
    assert.equal(again.status, 429, 'a second code within 30 seconds is refused')
  })

  it('wrong code is refused, five wrong codes lock that code', async () => {
    const phone = '9820011122' // Kabir (seed user)
    const { Otp } = await import('../src/models/index.js')
    await Otp.deleteMany({})
    const sent = await t.request.post('/api/auth/otp/send').send({ phone, purpose: 'login' })
    const wrong = sent.body.devOtp === '111111' ? '222222' : '111111'
    for (let i = 0; i < 5; i++) {
      const r = await t.request.post('/api/auth/login').send({ phone, otp: wrong })
      assert.equal(r.status, 400)
      assert.equal(r.body.error.code, 'incorrect_otp')
    }
    const locked = await t.request.post('/api/auth/login').send({ phone, otp: sent.body.devOtp })
    assert.equal(locked.status, 429, 'even the right code is refused after 5 misses')
  })

  it('logs in with the right code, sets an httpOnly cookie, /auth/me works, code is single-use, logout ends the session', async () => {
    const { Otp } = await import('../src/models/index.js')
    await Otp.deleteMany({})
    const client = request.agent(t.app)
    const sent = await client.post('/api/auth/otp/send').send({ phone: ADMIN_PHONE, purpose: 'login' })
    const res = await client.post('/api/auth/login').send({ phone: ADMIN_PHONE, otp: sent.body.devOtp })
    assert.equal(res.status, 200)
    assert.equal(res.body.user.role, 'admin')
    assert.match(res.headers['set-cookie'][0], /HttpOnly/i)
    assert.equal((await client.get('/api/auth/me')).body.user.phone, ADMIN_PHONE)

    const replay = await request(t.app).post('/api/auth/login').send({ phone: ADMIN_PHONE, otp: sent.body.devOtp })
    assert.equal(replay.status, 400, 'a used code cannot be used again')

    await client.post('/api/auth/logout')
    assert.equal((await client.get('/api/auth/me')).status, 401)
  })

  it('a deactivated account cannot log in', async () => {
    const { User } = await import('../src/models/index.js')
    await User.updateOne({ phone: '9820011122' }, { active: false })
    const res = await t.request.post('/api/auth/otp/send').send({ phone: '9820011122', purpose: 'login' })
    assert.equal(res.status, 403)
    await User.updateOne({ phone: '9820011122' }, { active: true })
  })

  it('register needs consent, a real name and a valid code', async () => {
    const phone = '9111100001'
    const sent = await t.request.post('/api/auth/otp/send').send({ phone, purpose: 'register' })
    const noConsent = await t.request.post('/api/auth/register').send({ phone, name: 'Asha Rao', otp: sent.body.devOtp })
    assert.equal(noConsent.status, 400)
    const badOtp = await t.request.post('/api/auth/register').send({ phone, name: 'Asha Rao', otp: '000000', consent: { accepted: true } })
    assert.equal(badOtp.status, 400)
  })

  it('a new CLIENT becomes a lead: consent proof stored, intent computed by the server from the raw profile', async () => {
    const { Lead, Consent, User } = await import('../src/models/index.js')
    const client = await t.register({
      phone: '9111100002',
      name: 'Riya Sharma',
      source: 'nudge',
      intent: 'Hot', // a client cannot choose its own intent — must be ignored
      profile: {
        visits: 2,
        views: [
          { id: 'p1', city: 'Mumbai', type: 'Apartment', beds: 3, purpose: 'Buy', price: 21500000, t: 1 },
          { id: 'p13', city: 'Mumbai', type: 'Apartment', beds: 2, purpose: 'Buy', price: 12000000, t: 2 },
        ],
        searches: [{ purpose: 'Buy', city: 'Mumbai', q: '', maxPrice: '' }],
        saves: [], compares: [],
      },
    })
    assert.equal(client.registered.user.role, 'user')
    assert.equal(client.registered.agent, null)
    const lead = await Lead.findOne({ phone: '9111100002' })
    assert.equal(lead.source, 'signup-prompt')
    assert.equal(lead.phoneVerified, true)
    assert.equal(lead.consent, true)
    assert.equal(lead.interest.city, 'Mumbai')
    assert.match(lead.interest.line, /Looking for/)
    assert.equal(lead.intent, 'Warm') // 2 views + 1 search + returning visitor = 9 points → Warm, not the "Hot" the client claimed
    const consent = await Consent.findById(lead.consentId)
    assert.ok(consent.text.length > 30, 'the exact sentence is stored')
    assert.equal(consent.legalVersions.terms.length > 0, true, 'legal versions are stored')
    assert.equal((await User.findOne({ phone: '9111100002' })).role, 'user')
  })

  it('a new AGENT gets a pending agent record and cannot pick the admin role', async () => {
    const { Agent, Consent } = await import('../src/models/index.js')
    const client = await t.register({ phone: '9111100003', name: 'Rohit Verma', role: 'agent', city: 'Gurugram', agency: 'Verma Realty', reraId: 'RA/HR/1' })
    assert.equal(client.registered.user.role, 'agent')
    assert.equal(client.registered.agent.status, 'pending')
    const agent = await Agent.findOne({ phone: '+91 9111100003' })
    assert.equal(agent.agency, 'Verma Realty')
    assert.equal(agent.userId, client.registered.user.id)
    assert.equal(await Consent.countDocuments({ phone: '9111100003', kind: 'agent-registration' }), 1)
    const escalate = await t.request.post('/api/auth/register').send({ phone: '9111100004', name: 'Evil Admin', role: 'admin', otp: '123456', consent: { accepted: true } })
    assert.equal(escalate.status, 400, 'role "admin" is not an allowed value')
  })

  it('agent registration needs a city and can be switched off by the admin', async () => {
    const sent = await t.request.post('/api/auth/otp/send').send({ phone: '9111100005', purpose: 'register' })
    const noCity = await t.request.post('/api/auth/register').send({ phone: '9111100005', name: 'No City', role: 'agent', otp: sent.body.devOtp, consent: { accepted: true } })
    assert.equal(noCity.status, 400)

    const admin = await t.login(ADMIN_PHONE)
    const content = (await admin.get('/api/admin/settings')).body.siteContent
    content.agentProgram.enabled = false
    await admin.put('/api/admin/settings/siteContent').send({ value: content })
    const sent2 = await t.request.post('/api/auth/otp/send').send({ phone: '9111100006', purpose: 'register' })
    const closed = await t.request.post('/api/auth/register').send({ phone: '9111100006', name: 'Late Agent', role: 'agent', city: 'Pune', otp: sent2.body.devOtp, consent: { accepted: true } })
    assert.equal(closed.status, 403)
    content.agentProgram.enabled = true
    await admin.put('/api/admin/settings/siteContent').send({ value: content })
  })

  it('the same number cannot register twice', async () => {
    const res = await t.request.post('/api/auth/otp/send').send({ phone: '9111100002', purpose: 'register' })
    assert.equal(res.status, 409)
    assert.equal(res.body.error.code, 'phone_taken')
  })

  it('verify-phone gives a token that marks a public enquiry as verified', async () => {
    const { Lead } = await import('../src/models/index.js')
    const phone = '9111100007'
    const sent = await t.request.post('/api/auth/otp/send').send({ phone, purpose: 'verify' })
    const verified = await t.request.post('/api/auth/verify-phone').send({ phone, otp: sent.body.devOtp })
    assert.equal(verified.status, 200)
    const lead = await t.request.post('/api/leads').send({ name: 'Verified Vik', phone, propertyId: 'p1', phoneToken: verified.body.phoneToken })
    assert.equal(lead.status, 201)
    assert.equal((await Lead.findById(lead.body.id)).phoneVerified, true)
    const other = await t.request.post('/api/leads').send({ name: 'Someone Else', phone: '9111100008', propertyId: 'p1', phoneToken: verified.body.phoneToken })
    assert.equal((await Lead.findById(other.body.id)).phoneVerified, false, 'the token only proves the number it was issued for')
  })
})
