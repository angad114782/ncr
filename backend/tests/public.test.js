import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ADMIN_PHONE, startTestApp } from './helpers.js'

describe('public API', () => {
  let t
  before(async () => { t = await startTestApp() })
  after(async () => { await t.stop() })

  it('lists listings with filters, sorting and pages', async () => {
    const all = await t.request.get('/api/properties?limit=100')
    assert.equal(all.body.total, 14)

    const buyMumbai = await t.request.get('/api/properties?purpose=Buy&city=mumbai')
    assert.ok(buyMumbai.body.items.length >= 2)
    assert.ok(buyMumbai.body.items.every((p) => p.purpose === 'Buy' && p.city === 'Mumbai'))

    const threePlus = await t.request.get('/api/properties?beds=4')
    assert.ok(threePlus.body.items.every((p) => p.beds >= 4), 'beds=4 means 4 or more')

    const cheap = await t.request.get('/api/properties?maxPrice=5000000&sort=price-asc')
    const prices = cheap.body.items.map((p) => p.price)
    assert.ok(prices.every((p) => p <= 5000000))
    assert.deepEqual(prices, [...prices].sort((a, b) => a - b))

    const page = await t.request.get('/api/properties?limit=5&page=2')
    assert.equal(page.body.items.length, 5)
    assert.equal(page.body.pages, 3)

    const search = await t.request.get('/api/properties?q=bandra')
    assert.ok(search.body.items.length >= 1)
  })

  it('never exposes internal fields', async () => {
    const res = await t.request.get('/api/properties?limit=1')
    for (const k of ['submittedBy', 'reviewNote', 'reviewStatus', '_id', '__v']) assert.equal(k in res.body.items[0], false, k)
    assert.ok(res.body.items[0].id)
  })

  it('a search text that looks like a regex or a Mongo operator is harmless', async () => {
    assert.equal((await t.request.get('/api/properties?q=(.*[')).status, 200)
    // operator-style query keys are never turned into database operators: the filter is simply ignored
    const inj = await t.request.get('/api/properties?city[$ne]=Mumbai&limit=100')
    assert.equal(inj.status, 200)
    assert.equal(inj.body.total, 14)
    const badType = await t.request.get('/api/properties?purpose=Lease')
    assert.equal(badType.status, 400)
    assert.equal(badType.body.error.code, 'validation_error')
  })

  it('finds a listing by slug, and by an old id with a redirect hint', async () => {
    const bySlug = await t.request.get('/api/properties/riverside-4bhk-penthouse')
    assert.equal(bySlug.status, 200)
    assert.equal(bySlug.body.redirect, false)
    assert.equal(bySlug.body.canonicalPath, '/property/riverside-4bhk-penthouse')

    const byId = await t.request.get('/api/properties/p6')
    assert.equal(byId.body.redirect, true)
    assert.equal(byId.body.canonicalPath, '/property/riverside-4bhk-penthouse')

    const upper = await t.request.get('/api/properties/RIVERSIDE-4BHK-PENTHOUSE')
    assert.equal(upper.body.redirect, true)
    assert.equal((await t.request.get('/api/properties/no-such-thing')).status, 404)
  })

  it('a deactivated listing answers 410 Gone; agent drafts look like they do not exist', async () => {
    const { Property } = await import('../src/models/index.js')
    await Property.updateOne({ _id: 'p7' }, { active: false })
    assert.equal((await t.request.get('/api/properties/p7')).status, 410)
    assert.equal((await t.request.get('/api/properties?limit=100')).body.items.some((p) => p.id === 'p7'), false)
    await Property.updateOne({ _id: 'p7' }, { active: true })

    await Property.updateOne({ _id: 'p8' }, { reviewStatus: 'pending', active: false })
    assert.equal((await t.request.get('/api/properties/p8')).status, 404)
    const admin = await t.login(ADMIN_PHONE)
    const preview = await admin.get('/api/properties/p8')
    assert.equal(preview.status, 200)
    assert.equal(preview.body.preview, true)
    await Property.updateOne({ _id: 'p8' }, { reviewStatus: 'approved', active: true })
  })

  it('only approved, active agents are public — and they have no private fields', async () => {
    const { Agent } = await import('../src/models/index.js')
    await Agent.create({ _id: 'apending', name: 'Pending Person', status: 'pending' })
    const list = await t.request.get('/api/agents')
    assert.equal(list.body.items.some((a) => a.id === 'apending'), false)
    assert.equal((await t.request.get('/api/agents/apending')).status, 404)
    const one = await t.request.get('/api/agents/a1')
    assert.equal(one.status, 200)
    assert.equal('userId' in one.body.agent, false)
    assert.ok(Array.isArray(one.body.properties))
  })

  it('serves blog posts, FAQs and reviews (only active ones)', async () => {
    const blog = await t.request.get('/api/blog')
    assert.equal(blog.body.items.length, 7)
    assert.ok(blog.body.items[0].summary, 'the Quick answer field is served')
    assert.equal((await t.request.get('/api/blog/how-to-check-rera-registration')).status, 200)
    assert.equal((await t.request.get('/api/blog/nope')).status, 404)
    const faqs = await t.request.get('/api/faqs?page=home')
    assert.ok(faqs.body.items.length > 0 && faqs.body.items.every((f) => f.pages.includes('home')))
    assert.equal((await t.request.get('/api/testimonials')).body.items.length, 0, 'sample reviews are inactive until the admin turns them on')
  })

  it('public settings hold no secrets', async () => {
    const res = await t.request.get('/api/public/settings')
    const text = JSON.stringify(res.body)
    assert.ok(res.body.siteContent.legal.terms.title)
    assert.equal(text.includes('accessToken'), false)
    assert.equal(text.includes('smtpPassword'), false)
    assert.equal(res.body.whatsapp.displayPhone, '8619930583')
  })

  it('bootstrap is a single call with everything, matching the individual endpoints', async () => {
    const res = await t.request.get('/api/public/bootstrap')
    assert.deepEqual(Object.keys(res.body).sort(), ['agents', 'faqs', 'posts', 'properties', 'settings', 'testimonials'])
    assert.equal(res.body.properties.length, 14)
  })
})
