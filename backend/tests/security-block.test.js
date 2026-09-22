import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ADMIN_PHONE, startTestApp } from './helpers.js'

/**
 * The escalating IP/phone block ladder (`lib/security-block.js`): 24h → 48h → 7 days → permanent. The real
 * express-rate-limit trip that normally triggers `registerOffense` is switched off for the whole test run
 * (`skip: () => config.isTest`, same as every other rate limiter), so this drives the ladder directly and
 * proves the guards it feeds (`ipBlockGuard`, `phoneBlockGuard`) actually turn a blocked key away.
 */
describe('security blocks', () => {
  let t, admin, security, config, SecurityBlock, Otp

  before(async () => {
    t = await startTestApp()
    admin = await t.login(ADMIN_PHONE)
    // Imported only after startTestApp has set the test environment (a top-level import would read config too early).
    security = await import('../src/lib/security-block.js')
    ;({ config } = await import('../src/config.js'))
    ;({ SecurityBlock, Otp } = await import('../src/models/index.js'))
  })
  after(async () => { await t.stop() })
  beforeEach(async () => {
    await SecurityBlock.deleteMany({})
    await Otp.deleteMany({})
  })

  const HOUR = 60 * 60_000
  const near = (date, ms, tol = 60_000) => Math.abs(date.getTime() - Date.now() - ms) < tol
  const expire = (key) => SecurityBlock.updateOne({ key }, { $set: { blockedUntil: new Date(Date.now() - 1000) } }) // fast-forward past the current sentence

  it('escalates 24h → 48h → 7 days → permanent, one step per served sentence', async () => {
    await security.registerOffense('ip', '10.0.0.1', 'auth_abuse', '/api/auth/login')
    let doc = await SecurityBlock.findOne({ key: 'ip:10.0.0.1' }).lean()
    assert.equal(doc.strikes, 1)
    assert.equal(doc.permanent, false)
    assert.ok(near(doc.blockedUntil, 24 * HOUR), doc.blockedUntil)

    await expire('ip:10.0.0.1')
    await security.registerOffense('ip', '10.0.0.1', 'auth_abuse', '/api/auth/login')
    doc = await SecurityBlock.findOne({ key: 'ip:10.0.0.1' }).lean()
    assert.equal(doc.strikes, 2)
    assert.ok(near(doc.blockedUntil, 48 * HOUR), doc.blockedUntil)

    await expire('ip:10.0.0.1')
    await security.registerOffense('ip', '10.0.0.1', 'auth_abuse', '/api/auth/login')
    doc = await SecurityBlock.findOne({ key: 'ip:10.0.0.1' }).lean()
    assert.equal(doc.strikes, 3)
    assert.ok(near(doc.blockedUntil, 7 * 24 * HOUR), doc.blockedUntil)

    await expire('ip:10.0.0.1')
    await security.registerOffense('ip', '10.0.0.1', 'auth_abuse', '/api/auth/login')
    doc = await SecurityBlock.findOne({ key: 'ip:10.0.0.1' }).lean()
    assert.equal(doc.strikes, 4)
    assert.equal(doc.permanent, true)
    assert.equal(doc.blockedUntil, null)
  })

  it('a burst while already blocked does not escalate further (no jumping straight to permanent)', async () => {
    await security.registerOffense('ip', '10.0.0.2', 'form_spam', '/api/leads')
    for (let i = 0; i < 5; i++) await security.registerOffense('ip', '10.0.0.2', 'form_spam', '/api/leads') // still mid-sentence every time
    const doc = await SecurityBlock.findOne({ key: 'ip:10.0.0.2' }).lean()
    assert.equal(doc.strikes, 1)
    assert.equal(doc.permanent, false)
    assert.equal(doc.log.length, 6, 'every attempt is still logged, for the admin screen')
  })

  it('checkBlock: null when free, {until} when timed, {permanent} once permanent', async () => {
    assert.equal(await security.checkBlock('ip', '10.0.0.3'), null)
    await security.registerOffense('ip', '10.0.0.3', 'auth_abuse')
    assert.ok((await security.checkBlock('ip', '10.0.0.3')).until)
    await expire('ip:10.0.0.3')
    assert.equal(await security.checkBlock('ip', '10.0.0.3'), null, 'an expired block is not a block')
    for (let i = 0; i < 3; i++) {
      await security.registerOffense('ip', '10.0.0.3', 'auth_abuse')
      await expire('ip:10.0.0.3')
    }
    await security.registerOffense('ip', '10.0.0.3', 'auth_abuse')
    assert.deepEqual(await security.checkBlock('ip', '10.0.0.3'), { permanent: true })
  })

  it('the admin phone is never blocked, however it is attacked', async () => {
    for (let i = 0; i < 6; i++) await security.registerOffense('phone', config.adminPhone, 'auth_abuse')
    assert.equal(await SecurityBlock.exists({ key: `phone:${config.adminPhone}` }), null)
    assert.equal(await security.checkBlock('phone', config.adminPhone), null)
  })

  it('ipBlockGuard turns a blocked IP away from the auth routes with 403, and lets it through once the block expires', async () => {
    // Learn this test client's real req.ip the same way the app already records it (Consent.ip on a lead).
    const { Consent } = await import('../src/models/index.js')
    await t.request.post('/api/leads').send({ name: 'IP Probe', phone: '9600000001', source: 'contact_page' })
    const ip = (await Consent.findOne({ phone: '9600000001' }).sort({ createdAt: -1 }).lean()).ip

    await security.registerOffense('ip', ip, 'auth_abuse', '/api/auth/otp/send')
    const blocked = await t.request.post('/api/auth/otp/send').send({ phone: '9600000002', purpose: 'register' })
    assert.equal(blocked.status, 403)
    assert.equal(blocked.body.error.code, 'blocked')

    await expire(`ip:${ip}`)
    const after1 = await t.request.post('/api/auth/otp/send').send({ phone: '9600000002', purpose: 'register' })
    assert.notEqual(after1.status, 403)
  })

  it('phoneBlockGuard turns away a blocked phone number even from a fresh IP', async () => {
    await security.registerOffense('phone', '9600000003', 'otp_never_verified', '/api/auth/otp/send')
    const res = await t.request.post('/api/auth/otp/send').send({ phone: '9600000003', purpose: 'register' })
    assert.equal(res.status, 403)
    assert.equal(res.body.error.code, 'blocked')
  })

  it('a number that keeps asking for a code and never verifies is auto-blocked (issueOtp)', async () => {
    const { issueOtp } = await import('../src/services/auth.js')
    const phone = '9600000004'
    const dayAgo = new Date(Date.now() - 60 * 60_000) // within the last 24h, outside the 10-min / 30-day cooldown windows this test doesn't exercise
    await Otp.insertMany(
      Array.from({ length: 8 }, (_, i) => ({ phone, purpose: 'register', codeHash: 'x', expiresAt: new Date(Date.now() - 1000), consumed: false, createdAt: dayAgo, ip: '' })),
    )
    await assert.rejects(issueOtp(phone, 'register', ''), /without it being confirmed/)
    assert.deepEqual(await security.checkBlock('phone', phone), { until: (await SecurityBlock.findOne({ key: `phone:${phone}` }).lean()).blockedUntil })
  })

  it('…but not if even one of those codes was actually verified', async () => {
    const { issueOtp } = await import('../src/services/auth.js')
    const phone = '9600000005'
    const dayAgo = new Date(Date.now() - 60 * 60_000)
    await Otp.insertMany([
      { phone, purpose: 'register', codeHash: 'x', expiresAt: new Date(Date.now() - 1000), consumed: true, createdAt: dayAgo, ip: '' },
      ...Array.from({ length: 7 }, () => ({ phone, purpose: 'register', codeHash: 'x', expiresAt: new Date(Date.now() - 1000), consumed: false, createdAt: dayAgo, ip: '' })),
    ])
    await issueOtp(phone, 'register', '') // succeeds — a real person who eventually confirmed once
    assert.equal(await security.checkBlock('phone', phone), null)
  })

  it('admin: lists blocks and can unblock one', async () => {
    assert.equal((await t.request.get('/api/admin/security/blocks')).status, 401)
    await security.registerOffense('ip', '10.0.0.9', 'auth_abuse')
    const list = await admin.get('/api/admin/security/blocks?q=10.0.0.9')
    assert.equal(list.status, 200)
    assert.equal(list.body.items.length, 1)
    const id = list.body.items[0].id

    const unblocked = await admin.post(`/api/admin/security/blocks/${id}/unblock`)
    assert.equal(unblocked.status, 200)
    assert.equal(unblocked.body.item.permanent, false)
    assert.equal(unblocked.body.item.blockedUntil, null)
    assert.equal(await security.checkBlock('ip', '10.0.0.9'), null)

    const { Audit } = await import('../src/models/index.js')
    assert.ok(await Audit.exists({ action: 'unblock-security', entityId: id }))
  })
})
