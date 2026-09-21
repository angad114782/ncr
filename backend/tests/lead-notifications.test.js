import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ADMIN_PHONE, startTestApp } from './helpers.js'

/**
 * WhatsApp messages when a lead form is filled: the team (admin) gets a notification, the visitor a welcome.
 * The real WhatsApp Cloud API is never called — fetch is replaced by a recorder.
 */
describe('lead WhatsApp messages', () => {
  let t, admin, calls, realFetch, failTemplate
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const waitFor = async (fn, ms = 2000) => {
    for (let i = 0; i < ms / 25 && !fn(); i++) await sleep(25)
  }
  const body = (c) => c.template.components[0].parameters.map((p) => p.text)
  const sentTo = (n) => calls.filter((c) => c.to === `91${n}`)
  const setWa = async (patch) => {
    const { getSetting, saveSetting } = await import('../src/services/settings.js')
    await saveSetting('whatsapp', { ...(await getSetting('whatsapp')), ...patch })
  }

  before(async () => {
    t = await startTestApp()
    admin = await t.login(ADMIN_PHONE)
    realFetch = globalThis.fetch
    globalThis.fetch = async (url, opts) => {
      if (!String(url).includes('graph.facebook.com')) return realFetch(url, opts)
      const payload = JSON.parse(opts.body)
      calls.push(payload)
      if (failTemplate && payload.template.name === failTemplate) {
        return new Response(JSON.stringify({ error: { message: '(#132001) Template name does not exist in the translation' } }), { status: 404, headers: { 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ messages: [{ id: 'wamid.x' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
  })
  after(async () => {
    globalThis.fetch = realFetch
    await t.stop()
  })
  beforeEach(async () => {
    calls = []
    failTemplate = null
    const { Lead } = await import('../src/models/index.js')
    await Lead.deleteMany({})
    await setWa({ phoneNumberId: '1234567890', accessToken: 'test-token', displayPhone: ADMIN_PHONE, leadWelcomeEnabled: true, leadWelcomeVerifiedOnly: false })
  })

  it('a contact-form lead: the admin is notified and the visitor gets a welcome', async () => {
    const res = await t.request.post('/api/leads').send({ name: 'Riya Sharma', phone: '9811100001', source: 'contact_page', contactIntent: 'buy', message: 'Hello' })
    assert.equal(res.status, 201)
    await waitFor(() => calls.length >= 2)

    const toAdmin = sentTo(ADMIN_PHONE)
    assert.equal(toAdmin.length, 1)
    assert.equal(toAdmin[0].template.name, 'lead_notification')
    assert.deepEqual(body(toAdmin[0]), ['Riya Sharma', '9811100001', 'buying a property'])

    const toVisitor = sentTo('9811100001')
    assert.equal(toVisitor.length, 1)
    assert.equal(toVisitor[0].template.name, 'lead_thank_you')
    const [first, brand, topic] = body(toVisitor[0])
    assert.equal(first, 'Riya')
    assert.ok(brand.length > 1)
    assert.equal(topic, 'buying a property')
  })

  it('a property enquiry names the property, in both messages', async () => {
    await t.request.post('/api/leads').send({ name: 'Amit Verma', phone: '9811100002', source: 'property_lead_form', propertyId: 'p1' })
    await waitFor(() => calls.length >= 2)
    const { Property } = await import('../src/models/index.js')
    const title = (await Property.findById('p1').lean()).title
    assert.equal(body(sentTo(ADMIN_PHONE)[0])[2], title)
    assert.equal(body(sentTo('9811100002')[0])[2], title)
  })

  it('the lead records that the messages went out', async () => {
    const res = await t.request.post('/api/leads').send({ name: 'Nisha Rao', phone: '9811100003', source: 'contact_page' })
    const { Lead } = await import('../src/models/index.js')
    let lead
    for (let i = 0; i < 40; i++) {
      lead = await Lead.findById(res.body.id).lean()
      if (lead.welcomeSentAt && lead.adminNotifiedAt) break
      await sleep(25)
    }
    assert.ok(lead.welcomeSentAt, 'welcomeSentAt')
    assert.ok(lead.adminNotifiedAt, 'adminNotifiedAt')
  })

  it('the same number is welcomed once a day, even for another property — the team is told each time', async () => {
    await t.request.post('/api/leads').send({ name: 'Riya Sharma', phone: '9811100004', source: 'property_lead_form', propertyId: 'p1' })
    await waitFor(() => calls.length >= 2)
    await sleep(150)
    await t.request.post('/api/leads').send({ name: 'Riya Sharma', phone: '9811100004', source: 'property_lead_form', propertyId: 'p2' })
    await waitFor(() => sentTo(ADMIN_PHONE).length >= 2)
    await sleep(150)
    assert.equal(sentTo('9811100004').length, 1, 'one welcome')
    assert.equal(sentTo(ADMIN_PHONE).length, 2, 'two team notifications')
  })

  it('the same enquiry sent again is merged: no second notification, no second welcome', async () => {
    await t.request.post('/api/leads').send({ name: 'Dev Patel', phone: '9811100005', source: 'property_lead_form', propertyId: 'p1' })
    await waitFor(() => calls.length >= 2)
    await sleep(150)
    const before = calls.length
    await t.request.post('/api/leads').send({ name: 'Dev Patel', phone: '9811100005', source: 'property_lead_form', propertyId: 'p1' })
    await sleep(300)
    assert.equal(calls.length, before)
  })

  it('the admin can switch the visitor welcome off — the team is still told', async () => {
    await setWa({ leadWelcomeEnabled: false })
    await t.request.post('/api/leads').send({ name: 'Sana Khan', phone: '9811100006', source: 'contact_page' })
    await waitFor(() => sentTo(ADMIN_PHONE).length >= 1)
    await sleep(200)
    assert.equal(sentTo('9811100006').length, 0)
    assert.equal(sentTo(ADMIN_PHONE).length, 1)
  })

  it('"verified numbers only": an unverified number gets no welcome', async () => {
    await setWa({ leadWelcomeVerifiedOnly: true })
    await t.request.post('/api/leads').send({ name: 'Unverified Person', phone: '9811100007', source: 'contact_page' })
    await waitFor(() => sentTo(ADMIN_PHONE).length >= 1)
    await sleep(200)
    assert.equal(sentTo('9811100007').length, 0)
  })

  it('a failed welcome does not block the lead, and may be tried again later', async () => {
    failTemplate = 'lead_thank_you'
    const res = await t.request.post('/api/leads').send({ name: 'Kabir Singh', phone: '9811100008', source: 'contact_page' })
    assert.equal(res.status, 201, 'the lead is saved even when WhatsApp refuses')
    await waitFor(() => calls.length >= 2)
    const { Lead } = await import('../src/models/index.js')
    let lead
    for (let i = 0; i < 40; i++) {
      lead = await Lead.findById(res.body.id).lean()
      if (lead.adminNotifiedAt && !lead.welcomeSentAt) break
      await sleep(25)
    }
    assert.ok(lead.adminNotifiedAt)
    assert.equal(lead.welcomeSentAt ?? null, null)
  })

  it('template values are one clean line (no line breaks or empty values)', async () => {
    await t.request.post('/api/leads').send({ name: 'Multi   Space\nName', phone: '9811100009', source: 'contact_page' })
    await waitFor(() => calls.length >= 2)
    for (const c of calls) for (const v of body(c)) assert.ok(v && !/[\n\r\t]| {2}/.test(v), JSON.stringify(v))
  })

  it('admin "send test messages": needs an admin, reports each template and Meta\'s reason when one fails', async () => {
    assert.equal((await t.request.post('/api/admin/settings/whatsapp/test')).status, 401)
    failTemplate = 'lead_thank_you'
    const res = await admin.post('/api/admin/settings/whatsapp/test')
    assert.equal(res.status, 200)
    assert.equal(res.body.results.length, 2)
    assert.equal(res.body.results[0].ok, true)
    assert.equal(res.body.results[1].ok, false)
    assert.match(res.body.results[1].error, /Template name does not exist/)
    assert.equal(calls.every((c) => c.to === `91${ADMIN_PHONE}`), true, 'only ever sent to the admin\'s own number')
    assert.ok(!JSON.stringify(res.body).includes('test-token'), 'the access token is never returned')
  })

  it('without WhatsApp configured nothing is sent and the lead is still saved', async () => {
    await setWa({ phoneNumberId: '', accessToken: '' })
    const res = await t.request.post('/api/leads').send({ name: 'No Provider', phone: '9811100010', source: 'contact_page' })
    assert.equal(res.status, 201)
    await sleep(300)
    assert.equal(calls.length, 0)
  })
})
