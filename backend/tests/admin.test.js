import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ADMIN_PHONE, startTestApp } from './helpers.js'

const base = (over = {}) => ({ title: 'Twin Tower Flat', purpose: 'Buy', type: 'Apartment', city: 'Pune', locality: 'Baner', price: 7500000, beds: 2, ...over })

describe('admin API', () => {
  let t, admin, user
  before(async () => {
    t = await startTestApp()
    admin = await t.login(ADMIN_PHONE)
    user = await t.login('9820011122')
  })
  after(async () => { await t.stop() })

  it('every admin endpoint refuses visitors and ordinary users', async () => {
    for (const path of ['/api/admin/properties', '/api/admin/users', '/api/admin/leads', '/api/admin/settings', '/api/admin/stats', '/api/admin/backup']) {
      assert.equal((await t.request.get(path)).status, 401, path)
      assert.equal((await user.get(path)).status, 403, path)
    }
  })

  describe('listings and their URLs', () => {
    it('a duplicate title gets the city, then the locality, then a number', async () => {
      const a = await admin.post('/api/admin/properties').send(base())
      const b = await admin.post('/api/admin/properties').send(base())
      const c = await admin.post('/api/admin/properties').send(base({ city: 'Pune', locality: 'Wakad' }))
      const d = await admin.post('/api/admin/properties').send(base())
      assert.equal(a.status, 201)
      assert.equal(a.body.property.slug, 'twin-tower-flat')
      assert.equal(b.body.property.slug, 'twin-tower-flat-pune')
      assert.equal(c.body.property.slug, 'twin-tower-flat-wakad')
      assert.equal(d.body.property.slug, 'twin-tower-flat-baner')
      const e = await admin.post('/api/admin/properties').send(base())
      assert.equal(e.body.property.slug, 'twin-tower-flat-baner-pune', 'next: locality + city')
      const f = await admin.post('/api/admin/properties').send(base())
      assert.equal(f.body.property.slug, 'twin-tower-flat-apartment-pune', 'next: type + city')
    })

    it('a typed slug is cleaned; a taken one is replaced by a unique one; the old one keeps redirecting', async () => {
      const made = (await admin.post('/api/admin/properties').send(base({ title: 'Custom Home' }))).body.property
      const renamed = await admin.patch(`/api/admin/properties/${made.id}`).send({ slug: 'My Custom URL!' })
      assert.equal(renamed.body.property.slug, 'my-custom-url')
      assert.deepEqual(renamed.body.property.previousSlugs, ['custom-home'])
      const old = await t.request.get('/api/properties/custom-home')
      assert.equal(old.body.redirect, true)
      assert.equal(old.body.canonicalPath, '/property/my-custom-url')

      const other = (await admin.post('/api/admin/properties').send(base({ title: 'Another Home', slug: 'my-custom-url' }))).body.property
      assert.notEqual(other.slug, 'my-custom-url', 'a slug already used by another listing is never reused')
      const usesOldSlug = (await admin.post('/api/admin/properties').send(base({ title: 'Custom Home' }))).body.property
      assert.notEqual(usesOldSlug.slug, 'custom-home', 'an old slug is reserved so the redirect stays unambiguous')
    })

    it('editing the title keeps the URL; clearing the slug regenerates it', async () => {
      const made = (await admin.post('/api/admin/properties').send(base({ title: 'Stable Home' }))).body.property
      const edited = await admin.patch(`/api/admin/properties/${made.id}`).send({ title: 'Completely New Title' })
      assert.equal(edited.body.property.slug, 'stable-home')
      const cleared = await admin.patch(`/api/admin/properties/${made.id}`).send({ slug: '' })
      assert.equal(cleared.body.property.slug, 'completely-new-title')
    })

    it('validates input: price, purpose, image links, unknown fields dropped', async () => {
      assert.equal((await admin.post('/api/admin/properties').send(base({ price: 0 }))).status, 400)
      assert.equal((await admin.post('/api/admin/properties').send(base({ purpose: 'Lease' }))).status, 400)
      assert.equal((await admin.post('/api/admin/properties').send(base({ images: ['javascript:alert(1)'] }))).status, 400)
      const res = await admin.post('/api/admin/properties').send(base({ title: 'Clean Input', hacked: true, $where: '1' }))
      assert.equal(res.status, 201)
      assert.equal('hacked' in res.body.property, false)
    })

    it('active toggle on a waiting listing approves it (agent must be approved first)', async () => {
      const { Property } = await import('../src/models/index.js')
      await Property.updateOne({ _id: 'p9' }, { reviewStatus: 'pending', active: false, agentId: 'a1' })
      const on = await admin.patch('/api/admin/properties/p9').send({ active: true })
      assert.equal(on.body.property.reviewStatus, 'approved')
      assert.equal(on.body.property.active, true)
    })

    it('bulk actions report what worked and what did not', async () => {
      const { Property, Agent } = await import('../src/models/index.js')
      await Agent.create({ _id: 'agpending', name: 'Not Yet', status: 'pending' })
      await Property.updateOne({ _id: 'p10' }, { agentId: 'agpending', reviewStatus: 'pending', active: false })
      const res = await admin.post('/api/admin/properties/bulk/action').send({ ids: ['p10', 'p11'], action: 'activate' })
      assert.equal(res.body.done, 1)
      assert.equal(res.body.failed[0].id, 'p10')
      const off = await admin.post('/api/admin/properties/bulk/action').send({ ids: ['p11'], action: 'deactivate' })
      assert.equal(off.body.done, 1)
      assert.equal((await t.request.get('/api/properties/p11')).status, 410)
      await Property.updateOne({ _id: 'p11' }, { active: true })
    })

    it('CSV rows import: an existing id updates, others are added, same titles get distinct slugs', async () => {
      const res = await admin.post('/api/admin/properties/import/rows').send({ items: [
        { id: 'p12', title: 'Gachibowli Tech Residency', purpose: 'Rent', city: 'Hyderabad', price: 65000 },
        { title: 'CSV Twin', purpose: 'Buy', city: 'Delhi', price: 5000000, locality: 'Dwarka' },
        { title: 'CSV Twin', purpose: 'Buy', city: 'Delhi', price: 5200000, locality: 'Rohini' },
      ] })
      assert.equal(res.status, 201)
      assert.deepEqual([res.body.added, res.body.updated], [2, 1])
      const twins = (await admin.get('/api/admin/properties?q=CSV Twin')).body.items.map((p) => p.slug).sort()
      assert.deepEqual(twins, ['csv-twin', 'csv-twin-delhi'])
    })

    it('list filters: pending review, search, pages', async () => {
      const { Property } = await import('../src/models/index.js')
      await Property.updateOne({ _id: 'p13' }, { reviewStatus: 'pending', active: false })
      const pending = await admin.get('/api/admin/properties?reviewStatus=pending')
      assert.ok(pending.body.items.some((p) => p.id === 'p13'))
      assert.ok(pending.body.items.every((p) => p.reviewStatus === 'pending'))
      assert.ok(pending.body.pendingReview >= 1)
      await Property.updateOne({ _id: 'p13' }, { reviewStatus: 'approved', active: true })
    })
  })

  describe('agents, users, content', () => {
    it('rejecting an agent hides their listings; a status change is recorded', async () => {
      const { Property } = await import('../src/models/index.js')
      await Property.updateOne({ _id: 'p14' }, { agentId: 'a2' })
      await admin.patch('/api/admin/agents/a2').send({ status: 'rejected' })
      assert.equal((await t.request.get('/api/properties/p14')).status, 410)
      assert.equal((await t.request.get('/api/agents/a2')).status, 404)
      await admin.patch('/api/admin/agents/a2').send({ status: 'approved' })
      await Property.updateOne({ _id: 'p14' }, { active: true })
    })

    it('users: create, role change, phone uniqueness, and the last admin can never be lost', async () => {
      const made = await admin.post('/api/admin/users').send({ name: 'New Agent User', phone: '9444400001', role: 'agent', city: 'Pune' })
      assert.equal(made.status, 201)
      assert.ok(made.body.item.agentId, 'an agent user gets an agent record id')
      assert.equal((await admin.post('/api/admin/users').send({ name: 'Dup', phone: '9444400001' })).status, 409)

      const me = (await admin.get('/api/auth/me')).body.user
      const demote = await admin.patch(`/api/admin/users/${me.id}`).send({ role: 'user' })
      assert.equal(demote.status, 409)
      assert.equal(demote.body.error.code, 'last_admin')
      assert.equal((await admin.patch(`/api/admin/users/${me.id}`).send({ active: false })).status, 409)
      assert.equal((await admin.delete(`/api/admin/users/${me.id}`)).status, 409, 'cannot delete yourself')

      // with a second admin the first one can step down
      const second = (await admin.post('/api/admin/users').send({ name: 'Second Admin', phone: '9444400002', role: 'admin' })).body.item
      assert.equal((await admin.patch(`/api/admin/users/${second.id}`).send({ role: 'user' })).status, 200)
    })

    it('a deactivated user is signed out immediately', async () => {
      const kabir = (await admin.get('/api/admin/users?q=Kabir')).body.items[0]
      await admin.patch(`/api/admin/users/${kabir.id}`).send({ active: false })
      assert.equal((await user.get('/api/auth/me')).status, 401)
      await admin.patch(`/api/admin/users/${kabir.id}`).send({ active: true })
    })

    it('blog: create with a slug from the title, slug conflicts, publish, quick-answer summary', async () => {
      const a = await admin.post('/api/admin/blog').send({ title: 'What Is Stamp Duty?', summary: 'A government fee.', body: '## Intro\n\nText', active: true })
      assert.equal(a.status, 201)
      assert.equal(a.body.item.slug, 'what-is-stamp-duty')
      assert.equal(a.body.item.summary, 'A government fee.')
      const b = await admin.post('/api/admin/blog').send({ title: 'What Is Stamp Duty?' })
      assert.equal(b.body.item.slug, 'what-is-stamp-duty-2')
      const clash = await admin.patch(`/api/admin/blog/${b.body.item.id}`).send({ slug: 'what-is-stamp-duty' })
      assert.equal(clash.status, 409)
      assert.equal((await t.request.get('/api/blog/what-is-stamp-duty')).status, 200)
      assert.equal((await t.request.get('/api/blog/what-is-stamp-duty-2')).status, 404, 'a draft is not public')
    })

    it('FAQs and reviews: create, reorder, activate, delete', async () => {
      const f1 = (await admin.post('/api/admin/faqs').send({ question: 'Q one?', answer: 'A one', pages: ['home'] })).body.item
      const f2 = (await admin.post('/api/admin/faqs').send({ question: 'Q two?', answer: 'A two', pages: ['home'] })).body.item
      await admin.post('/api/admin/faqs/reorder').send({ ids: [f2.id, f1.id] })
      const order = (await t.request.get('/api/faqs?page=home')).body.items.map((f) => f.id)
      assert.ok(order.indexOf(f2.id) < order.indexOf(f1.id))
      await admin.post('/api/admin/faqs/bulk/action').send({ ids: [f1.id], action: 'deactivate' })
      assert.equal((await t.request.get('/api/faqs')).body.items.some((f) => f.id === f1.id), false)
      assert.equal((await admin.delete(`/api/admin/faqs/${f2.id}`)).status, 200)

      const r = await admin.post('/api/admin/testimonials').send({ name: 'Happy Buyer', text: 'Great service', rating: 5, active: true })
      assert.equal((await t.request.get('/api/testimonials')).body.items.length, 1)
      await admin.delete(`/api/admin/testimonials/${r.body.item.id}`)
    })
  })

  describe('settings', () => {
    it('secrets are never returned, and a blank secret keeps the stored one', async () => {
      const put = await admin.put('/api/admin/settings/whatsapp').send({ value: { displayPhone: '9999999999', phoneNumberId: '123', accessToken: 'SECRET-TOKEN', otpTemplate: 'otp' } })
      assert.equal(put.status, 200)
      assert.equal(JSON.stringify(put.body).includes('SECRET-TOKEN'), false)
      assert.equal(put.body.value.hasAccessToken, true)
      // the admin form resends the object without the token
      await admin.put('/api/admin/settings/whatsapp').send({ value: { displayPhone: '9999999999', phoneNumberId: '123', accessToken: '', otpTemplate: 'otp2' } })
      const { getAllSettings } = await import('../src/services/settings.js')
      assert.equal((await getAllSettings()).whatsapp.accessToken, 'SECRET-TOKEN')
      assert.equal(JSON.stringify((await admin.get('/api/admin/settings')).body).includes('SECRET-TOKEN'), false)
      assert.equal(JSON.stringify((await t.request.get('/api/public/settings')).body).includes('SECRET-TOKEN'), false)
      assert.equal((await t.request.get('/api/public/settings')).body.whatsapp.displayPhone, '9999999999')
    })

    it('cities / property types must be lists of names; unknown keys are refused', async () => {
      assert.equal((await admin.put('/api/admin/settings/cities').send({ value: ['Mumbai', 'Noida'] })).status, 200)
      assert.deepEqual((await t.request.get('/api/public/settings')).body.cities, ['Mumbai', 'Noida'])
      assert.equal((await admin.put('/api/admin/settings/cities').send({ value: [{ a: 1 }] })).status, 400)
      assert.equal((await admin.put('/api/admin/settings/hacker').send({ value: {} })).status, 400)
    })

    it('legal page edits are versioned', async () => {
      const content = (await admin.get('/api/admin/settings')).body.siteContent
      content.legal.terms.intro = 'NEW TERMS INTRO'
      content.legal.terms.updated = '2026-10-01'
      await admin.put('/api/admin/settings/siteContent').send({ value: content })
      assert.equal((await t.request.get('/api/public/settings')).body.siteContent.legal.terms.intro, 'NEW TERMS INTRO')
      const history = (await admin.get('/api/admin/legal-history?kind=terms')).body.items
      assert.equal(history.length, 1)
      assert.equal(history[0].snapshot.intro, 'NEW TERMS INTRO')
      assert.equal(history[0].updatedDate, '2026-10-01')
      // saving again without a change to the legal text adds no version
      await admin.put('/api/admin/settings/siteContent').send({ value: content })
      assert.equal((await admin.get('/api/admin/legal-history?kind=terms')).body.items.length, 1)
    })

    it('a consent stores the version of each legal page that was live at the time', async () => {
      const client = await t.register({ phone: '9555500001', name: 'Consent Checker' })
      const consent = (await admin.get('/api/admin/consents?q=9555500001')).body.items[0]
      assert.equal(consent.legalVersions.terms, '2026-10-01')
      assert.equal(consent.kind, 'signup')
      assert.ok(client)
    })
  })

  describe('leads, stats, backup', () => {
    it('lists, filters, updates, annotates, assigns and exports leads (formula-safe CSV)', async () => {
      await t.request.post('/api/leads').send({ name: '=HYPERLINK("evil")', phone: '9666600001', propertyId: 'p1', message: '@SUM(1+1)' })
      const list = await admin.get('/api/admin/leads?intent=Warm')
      assert.ok(list.body.items.length >= 1)
      const lead = list.body.items.find((l) => l.phone === '9666600001')
      const patched = await admin.patch(`/api/admin/leads/${lead.id}`).send({ status: 'Responded', assignedAgentId: 'a1', note: 'Called, visit on Sunday' })
      assert.equal(patched.body.item.status, 'Responded')
      assert.equal(patched.body.item.notes[0].text, 'Called, visit on Sunday')
      assert.equal((await admin.patch(`/api/admin/leads/${lead.id}`).send({ assignedAgentId: 'nobody' })).status, 404)

      const csv = await admin.get('/api/admin/leads/export.csv')
      assert.match(csv.headers['content-type'], /text\/csv/)
      assert.ok(csv.text.includes(`"'=HYPERLINK`), 'text starting with = is neutralised')
      assert.ok(csv.text.includes(`"'@SUM`))
      assert.equal((await admin.delete(`/api/admin/leads/${lead.id}`)).status, 200)
    })

    it('dashboard stats add up', async () => {
      const s = (await admin.get('/api/admin/stats')).body
      assert.ok(s.properties.total >= 14 && s.properties.live >= 14)
      assert.ok(s.agents.approved >= 3)
      assert.ok(s.leads.total >= 1)
    })

    it('backup has content but no secrets', async () => {
      const res = await admin.get('/api/admin/backup')
      assert.equal(res.status, 200)
      const text = JSON.stringify(res.body)
      assert.ok(res.body.properties.length >= 14)
      assert.equal(text.includes('SECRET-TOKEN'), false)
      assert.equal(res.body.settings.some((s) => s.key === 'whatsapp'), false)
    })

    it('audit log records admin actions', async () => {
      await new Promise((r) => setTimeout(r, 100))
      const log = (await admin.get('/api/admin/audit?limit=100')).body
      assert.ok(log.items.some((a) => a.action === 'create-listing'))
    })
  })
})
