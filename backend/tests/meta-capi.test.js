import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ADMIN_PHONE, startTestApp } from './helpers.js'

/**
 * Meta Conversions API: fired only once a lead's phone is actually confirmed (same moment the
 * browser Pixel fires), sharing the lead's own id as event_id for dedup. The real Graph API is
 * never called — fetch is replaced by a recorder, same technique as lead-notifications.test.js.
 */
describe('Meta Conversions API', () => {
  let t, admin, calls, realFetch
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const waitFor = async (fn, ms = 2000) => {
    for (let i = 0; i < ms / 25 && !fn(); i++) await sleep(25)
  }
  const setMarketing = async (patch) => {
    const { getSetting, saveSetting } = await import('../src/services/settings.js')
    await saveSetting('marketing', { ...(await getSetting('marketing')), ...patch })
  }

  before(async () => {
    t = await startTestApp()
    admin = await t.login(ADMIN_PHONE)
    realFetch = globalThis.fetch
    globalThis.fetch = async (url, opts) => {
      if (!String(url).includes('graph.facebook.com') || !String(url).includes('/events')) return realFetch(url, opts)
      calls.push({ url: String(url), body: JSON.parse(opts.body) })
      return new Response(JSON.stringify({ events_received: 1 }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
  })
  after(async () => {
    globalThis.fetch = realFetch
    await t.stop()
  })
  beforeEach(async () => {
    calls = []
    const { Lead } = await import('../src/models/index.js')
    await Lead.deleteMany({})
    await setMarketing({ metaPixelId: '123456', metaCapiAccessToken: 'test-capi-token', metaTestEventCode: '' })
  })

  it('does nothing when not configured', async () => {
    await setMarketing({ metaPixelId: '', metaCapiAccessToken: '' })
    await t.request.post('/api/leads').send({ name: 'No Config', phone: '9811200001', source: 'contact_page' })
    await sleep(200)
    assert.equal(calls.length, 0)
  })

  it('an already-verified lead (signup) fires one Lead event with the lead id as event_id', async () => {
    const { Otp } = await import('../src/models/index.js')
    await Otp.deleteMany({ phone: '9811200002' })
    const client = t.request
    const sent = await client.post('/api/auth/otp/send').send({ phone: '9811200002', purpose: 'register' })
    const res = await client.post('/api/auth/register').send({ phone: '9811200002', otp: sent.body.devOtp, name: 'Riya Signup', consent: { accepted: true } })
    assert.equal(res.status, 201)
    await waitFor(() => calls.length >= 1)

    const { Lead } = await import('../src/models/index.js')
    const lead = await Lead.findOne({ phone: '9811200002' }).lean()
    assert.equal(calls.length, 1)
    const event = calls[0].body.data[0]
    assert.equal(event.event_name, 'Lead')
    assert.equal(event.event_id, lead._id)
    assert.equal(event.action_source, 'website')
    assert.ok(event.user_data.ph[0], 'phone is hashed, not sent in the clear')
    assert.notEqual(event.user_data.ph[0], '9811200002')
    assert.equal(event.user_data.ph[0].length, 64, 'sha256 hex digest')
  })

  it('the contact form (no OTP step at all) fires immediately, matching its unconditional client-side Pixel fire', async () => {
    const res = await t.request.post('/api/leads').send({ name: 'Contact Person', phone: '9811200009', source: 'contact_page', message: 'Hi' })
    assert.equal(res.status, 201)
    await waitFor(() => calls.length >= 1)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].body.data[0].event_id, res.body.id)
  })

  it('an unverified (pending) enquiry does not fire yet; verifying it fires exactly once', async () => {
    const lead = { name: 'Pooja Pending', phone: '9811200003', source: 'property_lead_form', propertyId: 'p1' }
    await t.request.post('/api/leads').send({ ...lead, stage: 'otp_sent' })
    await sleep(200)
    assert.equal(calls.length, 0, 'no CAPI event for an unconfirmed number')

    const { Otp } = await import('../src/models/index.js')
    await Otp.deleteMany({ phone: lead.phone })
    const sent = await t.request.post('/api/auth/otp/send').send({ phone: lead.phone, purpose: 'verify' })
    const verified = await t.request.post('/api/auth/verify-phone').send({ phone: lead.phone, otp: sent.body.devOtp })
    const res = await t.request.post('/api/leads').send({ ...lead, phoneToken: verified.body.phoneToken })
    assert.equal(res.status, 201)
    await waitFor(() => calls.length >= 1)
    await sleep(200)
    assert.equal(calls.length, 1, 'fires exactly once, when confirmed')
    assert.equal(calls[0].body.data[0].event_id, res.body.id)
  })

  it('admin test-send endpoint: admin only, reports Meta\'s own error on failure', async () => {
    assert.equal((await t.request.post('/api/admin/settings/meta-capi/test')).status, 401)

    const ok = await admin.post('/api/admin/settings/meta-capi/test')
    assert.equal(ok.status, 200)
    assert.equal(ok.body.ok, true)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].body.data[0].event_name, 'Lead')

    globalThis.fetch = async (url, opts) => {
      if (!String(url).includes('/events')) return realFetch(url, opts)
      return new Response(JSON.stringify({ error: { message: 'Invalid OAuth access token' } }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    const failed = await admin.post('/api/admin/settings/meta-capi/test')
    assert.equal(failed.body.ok, false)
    assert.match(failed.body.error, /Invalid OAuth access token/)
  })

  it('the access token never reaches public or admin-list responses (masked)', async () => {
    const pub = await t.request.get('/api/public/settings')
    assert.equal('metaCapiAccessToken' in pub.body.marketing, false)
    assert.equal('metaTestEventCode' in pub.body.marketing, false)
    assert.equal(pub.body.marketing.metaPixelId, '123456')

    const settings = await admin.get('/api/admin/settings')
    assert.equal(settings.body.marketing.metaCapiAccessToken, '')
    assert.equal(settings.body.marketing.hasMetaCapiAccessToken, true)
  })
})
