import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { ADMIN_PHONE, PNG, startTestApp } from './helpers.js'

describe('uploads', () => {
  let t, agent, client, admin
  before(async () => {
    t = await startTestApp()
    agent = await t.register({ phone: '9101010101', name: 'Upload Agent', role: 'agent', city: 'Pune' })
    client = await t.register({ phone: '9101010102', name: 'Plain Client' })
    admin = await t.login(ADMIN_PHONE)
  })
  after(async () => { await t.stop() })

  it('needs an agent or admin login', async () => {
    assert.equal((await t.request.post('/api/uploads').attach('files', PNG, { filename: 'a.png', contentType: 'image/png' })).status, 401)
    assert.equal((await client.post('/api/uploads').attach('files', PNG, { filename: 'a.png', contentType: 'image/png' })).status, 403)
  })

  it('stores a real image and serves it', async () => {
    const res = await agent.post('/api/uploads').attach('files', PNG, { filename: 'front.png', contentType: 'image/png' })
    assert.equal(res.status, 201)
    const { url } = res.body.items[0]
    assert.match(url, /\/uploads\/[a-z0-9-]+\.png$/)
    const served = await request(t.app).get(new URL(url).pathname)
    assert.equal(served.status, 200)
    assert.equal(served.headers['x-content-type-options'], 'nosniff')
  })

  it('refuses non-images and files whose bytes are not the image they claim to be', async () => {
    const html = await agent.post('/api/uploads').attach('files', Buffer.from('<script>alert(1)</script>'), { filename: 'x.html', contentType: 'text/html' })
    assert.equal(html.status, 400)
    const svg = await agent.post('/api/uploads').attach('files', Buffer.from('<svg onload=alert(1)>'), { filename: 'x.svg', contentType: 'image/svg+xml' })
    assert.equal(svg.status, 400)
    const fake = await agent.post('/api/uploads').attach('files', Buffer.from('this is not a png at all'), { filename: 'fake.png', contentType: 'image/png' })
    assert.equal(fake.status, 400)
    assert.match(fake.body.error.message, /not a valid PNG/)
    assert.equal((await agent.post('/api/uploads')).status, 400, 'no file')
  })

  it('an uploaded link can be used on a listing; an agent may delete only their own upload', async () => {
    const up = (await agent.post('/api/uploads').attach('files', PNG, { filename: 'p.png', contentType: 'image/png' })).body.items[0]
    const listing = await agent.post('/api/agent/properties').send({ title: 'Home With Photo', purpose: 'Buy', city: 'Pune', price: 5000000, images: [up.url] })
    assert.equal(listing.status, 201)
    assert.deepEqual(listing.body.property.images, [up.url])
    assert.equal((await admin.delete(`/api/uploads/${up.file}`)).status, 200)
    const mine = (await agent.post('/api/uploads').attach('files', PNG, { filename: 'q.png', contentType: 'image/png' })).body.items[0]
    const other = await t.register({ phone: '9101010103', name: 'Other Agent', role: 'agent', city: 'Pune' })
    assert.equal((await other.delete(`/api/uploads/${mine.file}`)).status, 403)
    assert.equal((await agent.delete(`/api/uploads/${mine.file}`)).status, 200)
  })
})

describe('security basics', () => {
  let t
  before(async () => { t = await startTestApp() })
  after(async () => { await t.stop() })

  it('sends security headers and hides the framework', async () => {
    const res = await t.request.get('/api/health')
    assert.equal(res.headers['x-powered-by'], undefined)
    assert.equal(res.headers['x-content-type-options'], 'nosniff')
    assert.ok(res.headers['strict-transport-security'])
    assert.ok(res.headers['content-security-policy'])
  })

  it('the session cookie is HttpOnly, SameSite and scoped to the site', async () => {
    const sent = await t.request.post('/api/auth/otp/send').send({ phone: '9820011122', purpose: 'login' })
    const res = await t.request.post('/api/auth/login').send({ phone: '9820011122', otp: sent.body.devOtp })
    const cookie = res.headers['set-cookie'][0]
    assert.match(cookie, /HttpOnly/i)
    assert.match(cookie, /SameSite=Lax/i)
    assert.match(cookie, /Path=\//)
  })

  it('refuses a state-changing request coming from an unknown website (CSRF)', async () => {
    const evil = await t.request.post('/api/leads').set('Origin', 'https://evil.example').send({ name: 'Eve', phone: '9999900001' })
    assert.equal(evil.status, 403)
    const fine = await t.request.post('/api/leads').set('Origin', 'http://localhost:5173').send({ name: 'Eve', phone: '9999900001' })
    assert.equal(fine.status, 201)
    assert.equal((await t.request.get('/api/health').set('Origin', 'https://evil.example')).status, 200, 'reading is not restricted by this guard')
  })

  it('bad JSON, huge bodies and unknown endpoints give clean JSON errors', async () => {
    const bad = await t.request.post('/api/leads').set('Content-Type', 'application/json').send('{not json')
    assert.equal(bad.status, 400)
    assert.equal(bad.body.error.code, 'bad_json')
    const big = await t.request.post('/api/leads').send({ name: 'x'.repeat(3 * 1024 * 1024), phone: '9999900002' })
    assert.equal(big.status, 413)
    const none = await t.request.get('/api/nothing-here')
    assert.equal(none.status, 404)
    assert.equal(none.body.error.code, 'not_found')
  })

  it('operator keys in a JSON body are stripped before they reach the database', async () => {
    const { Otp } = await import('../src/models/index.js')
    await Otp.deleteMany({})
    const res = await t.request.post('/api/auth/otp/send').send({ phone: { $ne: '' }, purpose: 'login' })
    assert.equal(res.status, 400, 'an object instead of a phone number is refused')
    const sent = await t.request.post('/api/auth/otp/send').send({ phone: '9820011122', purpose: 'login' })
    const login = await t.request.post('/api/auth/login').send({ phone: '9820011122', otp: { $gt: '' } })
    assert.equal(login.status, 400)
    assert.ok(sent.body.devOtp)
  })

  it('errors never leak stack traces or internals', async () => {
    const res = await t.request.get('/api/properties/%00%ff')
    assert.ok([200, 400, 404].includes(res.status))
    assert.equal(JSON.stringify(res.body).includes('node_modules'), false)
  })

  it('a tampered or expired session token is ignored', async () => {
    const res = await t.request.get('/api/auth/me').set('Cookie', 'ncr_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSIsInJvbGUiOiJhZG1pbiJ9.forged')
    assert.equal(res.status, 401)
    const bearer = await t.request.get('/api/admin/stats').set('Authorization', 'Bearer forged.token.here')
    assert.equal(bearer.status, 401)
  })

  it('OTP codes are stored hashed, never in clear text', async () => {
    const { Otp } = await import('../src/models/index.js')
    await Otp.deleteMany({})
    const sent = await t.request.post('/api/auth/otp/send').send({ phone: '9820011122', purpose: 'login' })
    const stored = await Otp.findOne({ phone: '9820011122' })
    assert.notEqual(stored.codeHash, sent.body.devOtp)
    assert.match(stored.codeHash, /^[a-f0-9]{64}$/)
  })
})

describe('production safety', () => {
  it('OTP is not exposed in the API response unless OTP_DEV_MODE is on, and delivery failure is reported', async () => {
    const t = await startTestApp()
    try {
      const { config } = await import('../src/config.js')
      config.otpDevMode = false
      const res = await t.request.post('/api/auth/otp/send').send({ phone: '9820011122', purpose: 'login' })
      assert.equal(res.status, 503, 'with no WhatsApp provider the code cannot be delivered')
      assert.equal(res.body.error.code, 'otp_unavailable')
      assert.equal(JSON.stringify(res.body).match(/\d{6}/), null)
      config.otpDevMode = true
    } finally {
      await t.stop()
    }
  })

  it('refuses to start in production with a weak configuration', async () => {
    const { assertConfig, config } = await import('../src/config.js')
    const saved = { isProd: config.isProd, otpDevMode: config.otpDevMode, jwtSecret: config.jwtSecret }
    Object.assign(config, { isProd: true, otpDevMode: true })
    assert.throws(() => assertConfig(), /OTP_DEV_MODE must be false/)
    Object.assign(config, { isProd: false, jwtSecret: 'short' })
    assert.throws(() => assertConfig(), /JWT_SECRET/)
    Object.assign(config, saved)
  })
})
