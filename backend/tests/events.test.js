import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import request from 'supertest'
import { ADMIN_PHONE, startTestApp } from './helpers.js'

/**
 * Live updates (Server-Sent Events, `lib/events.js` + `routes/events.js`). Runs against a real listening server
 * (supertest's app-instance mode never ends a response, so it can't be used for a stream that stays open) —
 * connections are read with the raw `http` module and destroyed at the end of each test.
 */
describe('live updates (SSE)', () => {
  let t, server, port

  const openConns = new Set() // every raw http.get() request opened below, so `after` can force-close any left dangling

  before(async () => {
    t = await startTestApp()
    server = t.app.listen(0)
    port = await new Promise((resolve) => server.on('listening', () => resolve(server.address().port)))
  })
  after(async () => {
    for (const req of openConns) req.destroy()
    await new Promise((resolve) => server.close(resolve))
    await t.stop()
  })

  /** Logs in with a real OTP round-trip and returns the raw Cookie header value (not a supertest agent). */
  async function cookieFor(phone) {
    const { Otp } = await import('../src/models/index.js')
    await Otp.deleteMany({ phone }) // a prior register()/login() for this phone would otherwise trip the resend cooldown
    const sent = await request(t.app).post('/api/auth/otp/send').send({ phone, purpose: 'login' })
    assert.equal(sent.status, 200, JSON.stringify(sent.body))
    const res = await request(t.app).post('/api/auth/login').send({ phone, otp: sent.body.devOtp })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    return res.headers['set-cookie'][0].split(';')[0]
  }

  /** Opens an SSE connection, splits it into frames as they arrive, and returns handles to read more / close it. */
  function openSSE(path, cookie) {
    return new Promise((resolve, reject) => {
      // agent: false — a dedicated socket per connection, not Node's default keep-alive pool, so destroying the
      // request actually closes the socket at once instead of possibly parking it for reuse.
      const req = http.get({ host: '127.0.0.1', port, path, headers: cookie ? { Cookie: cookie } : {}, agent: false }, (res) => {
        let buf = ''
        const frames = []
        res.on('data', (chunk) => {
          buf += chunk.toString('utf8')
          let idx
          while ((idx = buf.indexOf('\n\n')) !== -1) {
            frames.push(buf.slice(0, idx))
            buf = buf.slice(idx + 2)
          }
        })
        resolve({ req, res, frames, status: res.statusCode, headers: res.headers, close: () => { req.destroy(); openConns.delete(req) } })
      })
      req.on('error', reject)
      openConns.add(req)
    })
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const waitFor = async (frames, match, ms = 1500) => {
    for (let i = 0; i < ms / 25; i++) {
      if (frames.some(match)) return true
      await sleep(25)
    }
    return false
  }
  const named = (name) => (f) => f.startsWith(`event: ${name}\n`)

  it('sets SSE headers and sends a "ready" frame naming the connection\'s scopes', async () => {
    const conn = await openSSE('/api/events')
    await sleep(200)
    assert.equal(conn.status, 200)
    assert.match(conn.headers['content-type'], /text\/event-stream/)
    assert.equal(conn.headers['x-accel-buffering'], 'no')
    assert.ok(conn.frames.some(named('ready')))
    assert.deepEqual(JSON.parse(conn.frames.find(named('ready')).split('\ndata: ')[1]), { scopes: ['public'] })
    conn.close()
  })

  it('an anonymous visitor is "public" scope only — never sees an admin-only broadcast', async () => {
    const anon = await openSSE('/api/events')
    await sleep(150)
    const { broadcast } = await import('../src/lib/events.js')
    broadcast('admin', 'lead:new', { id: 'i1' })
    broadcast('public', 'content:changed', { reason: 'test' })
    await sleep(200)
    assert.equal(anon.frames.some(named('lead:new')), false, 'must not receive an admin-scoped event')
    assert.ok(anon.frames.some(named('content:changed')), 'does receive a public-scoped event')
    anon.close()
  })

  it('an admin connection gets "admin" scope too, and a new lead broadcasts there live', async () => {
    const cookie = await cookieFor(ADMIN_PHONE)
    const conn = await openSSE('/api/events', cookie)
    await sleep(200)
    assert.deepEqual(JSON.parse(conn.frames.find(named('ready')).split('\ndata: ')[1]).scopes.sort(), ['admin', 'public'])

    const res = await request(t.app).post('/api/leads').send({ name: 'Live Lead', phone: '9700000001', source: 'contact_page' })
    assert.equal(res.status, 201)
    assert.ok(await waitFor(conn.frames, named('lead:new')), 'admin connection should receive lead:new live')
    const data = JSON.parse(conn.frames.find(named('lead:new')).split('\ndata: ')[1])
    assert.equal(data.userName, 'Live Lead')
    conn.close()
  })

  it('an agent only gets their OWN agent:<id> scope, not another agent\'s', async () => {
    const rohit = await t.register({ phone: '9700000002', name: 'Rohit Agent', role: 'agent', city: 'Pune' })
    const priya = await t.register({ phone: '9700000003', name: 'Priya Agent', role: 'agent', city: 'Pune' })
    const rohitId = rohit.registered.user.agentId
    const priyaId = priya.registered.user.agentId
    const cookie = await cookieFor('9700000002')
    const conn = await openSSE('/api/events', cookie)
    await sleep(200)
    assert.deepEqual(JSON.parse(conn.frames.find(named('ready')).split('\ndata: ')[1]).scopes.sort(), [`agent:${rohitId}`, 'public'])

    const { broadcast } = await import('../src/lib/events.js')
    broadcast(`agent:${priyaId}`, 'listing:status', { id: 'p-priya' })
    broadcast(`agent:${rohitId}`, 'listing:status', { id: 'p-rohit' })
    await sleep(250)
    assert.equal(conn.frames.filter(named('listing:status')).length, 1, 'only the one meant for this agent')
    assert.match(conn.frames.find(named('listing:status')), /p-rohit/)
    conn.close()
  })

  it('approving an agent listing broadcasts listing:status live to that agent, and a new lead on it reaches them too', async () => {
    const agent = await t.register({ phone: '9700000004', name: 'Live Agent', role: 'agent', city: 'Mumbai' })
    const admin = await t.login(ADMIN_PHONE)
    // approve the agent record itself so its listing can go live
    const agentsList = await admin.get('/api/admin/agents')
    const rec = agentsList.body.items.find((a) => a.userId === agent.registered.user.id)
    await admin.patch(`/api/admin/agents/${rec.id}`).send({ status: 'approved' })

    const created = await agent.post('/api/agent/properties').send({ title: 'Live Test Flat', purpose: 'Buy', type: 'Apartment', city: 'Mumbai', locality: 'Andheri', price: 6000000, beds: 2 })
    assert.equal(created.status, 201)

    const cookie = await cookieFor('9700000004')
    const conn = await openSSE('/api/events', cookie)
    await sleep(200)

    const approved = await admin.post(`/api/admin/properties/${created.body.property.id}/approve`)
    assert.equal(approved.status, 200)
    assert.ok(await waitFor(conn.frames, named('listing:status')), 'agent should see the approval live')
    const status = JSON.parse(conn.frames.find(named('listing:status')).split('\ndata: ')[1])
    assert.equal(status.reviewStatus, 'approved')

    // a lead on that now-live property should also reach the agent live
    const lead = await request(t.app).post('/api/leads').send({ name: 'For Live Agent', phone: '9700000005', source: 'property_lead_form', propertyId: created.body.property.id })
    assert.equal(lead.status, 201)
    assert.ok(await waitFor(conn.frames, named('lead:new')), 'agent should see the lead live')
    conn.close()
  })

  it('a rejected/deleted connection does not leak: closing it drops it from the broadcaster', async () => {
    const { connectionCount } = await import('../src/lib/events.js')
    await sleep(300) // let every earlier test's connection finish closing before this one measures a baseline
    const before2 = connectionCount()
    const conn = await openSSE('/api/events')
    await sleep(150)
    assert.equal(connectionCount(), before2 + 1)
    conn.close()
    await sleep(300)
    assert.equal(connectionCount(), before2)
  })
})
