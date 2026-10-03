import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ADMIN_PHONE, startTestApp } from './helpers.js'
import { bhkSummary, hasBhk, titleCase } from '../src/lib/listingText.js'

describe('listing text rules', () => {
  it('capitalises titles but keeps acronyms and BHK counts', () => {
    assert.equal(titleCase('sea-facing 3bhk flat in DLF phase 2'), 'Sea-Facing 3BHK Flat in DLF Phase 2')
    assert.equal(titleCase('  swimming   pool '), 'Swimming Pool')
  })
  it('summarises and matches BHK sizes', () => {
    const p = { beds: 2, configurations: [{ beds: 2 }, { beds: 3 }, { beds: 4 }] }
    assert.equal(bhkSummary(p), '2, 3 & 4 BHK')
    assert.ok(hasBhk(p, 3) && hasBhk(p, 4) && !hasBhk(p, 1))
  })
})

describe('listings with BHK configurations and FAQs', () => {
  let t, admin
  before(async () => {
    t = await startTestApp()
    admin = await t.login(ADMIN_PHONE)
  })
  after(async () => { await t.stop() })

  it('takes its headline price / BHK from the smallest size, capitalises text, shows under every BHK filter', async () => {
    const res = await admin.post('/api/admin/properties').send({
      title: 'green valley residency', purpose: 'Buy', type: 'Apartment', city: 'Noida', locality: 'sector 150', description: 'a calm project. close to the metro.',
      amenities: ['club house', 'gym'],
      configurations: [{ beds: 4, areaSqft: 2100, price: 16000000 }, { beds: 2, areaSqft: 1100, price: 8500000 }, { beds: 3, areaSqft: 1550, price: 11500000 }],
      faqs: [{ question: 'is it rera registered?', answer: 'yes. the number is on the listing.' }],
    })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    const p = res.body.property
    assert.equal(p.title, 'Green Valley Residency')
    assert.equal(p.locality, 'Sector 150')
    assert.equal(p.price, 8500000)
    assert.equal(p.beds, 2)
    assert.equal(p.areaSqft, 1100)
    assert.match(p.priceLabel, /^From /)
    assert.deepEqual(p.configurations.map((c) => c.beds), [2, 3, 4])
    assert.deepEqual(p.amenities, ['Club House', 'Gym'])
    assert.equal(p.description, 'A calm project. Close to the metro.')
    assert.equal(p.faqs[0].question, 'Is it rera registered?')

    for (const beds of [2, 3, 4]) {
      const list = await t.request.get(`/api/properties?beds=${beds}&city=noida&limit=50`)
      assert.ok(list.body.items.some((x) => x.id === p.id), `${beds} BHK filter`)
    }
    const one = await t.request.get('/api/properties?beds=1&city=noida')
    assert.equal(one.body.items.some((x) => x.id === p.id), false)
  })

  it('a stale hand-typed price label is replaced once the listing has priced sizes', async () => {
    const res = await admin.post('/api/admin/properties').send({
      title: 'Stale Label Towers', purpose: 'Buy', city: 'Noida', priceLabel: '24.25 Lac',
      configurations: [{ beds: 2, areaSqft: 735, price: 2425000 }, { beds: 3, areaSqft: 755, price: 3399000 }],
    })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    assert.equal(res.body.property.priceLabel, 'From ₹24.3 L')
    assert.equal(res.body.property.beds, 2)
    assert.equal(res.body.property.areaSqft, 735)
  })

  it('accepts a project with no single price when sizes carry prices', async () => {
    const res = await admin.post('/api/admin/properties').send({ title: 'No Single Price', purpose: 'Buy', city: 'Noida', configurations: [{ beds: 3, areaSqft: 1500, price: 9000000 }] })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    assert.equal(res.body.property.price, 9000000)
  })
})

describe('price is still required', () => {
  it('rejects a listing with neither a price nor priced sizes', async () => {
    const t = await startTestApp()
    try {
      const admin = await t.login(ADMIN_PHONE)
      const res = await admin.post('/api/admin/properties').send({ title: 'Free House', purpose: 'Buy', city: 'Noida' })
      assert.equal(res.status, 400)
    } finally {
      await t.stop()
    }
  })
})

describe('stored listings are shown capitalised', () => {
  it('public API capitalises a listing saved in lower case', async () => {
    const t = await startTestApp()
    try {
      const { Property } = await import('../src/models/index.js')
      await Property.create({ _id: 'plow', slug: 'plow', title: 'old lower case flat', city: 'Noida', locality: 'sector 18', price: 5000000, amenities: ['lift'], faqs: [{ question: 'is parking free?', answer: 'yes. one slot.' }] })
      const res = await t.request.get('/api/properties/plow')
      assert.equal(res.status, 200)
      const p = res.body.property ?? res.body
      assert.equal(p.title, 'Old Lower Case Flat')
      assert.equal(p.locality, 'Sector 18')
      assert.deepEqual(p.amenities, ['Lift'])
      assert.equal(p.faqs[0].question, 'Is parking free?')
    } finally {
      await t.stop()
    }
  })
})

describe('nearby places keep their real position; sizes keep their bathrooms', () => {
  it('stores lat/lng on nearby places and baths on sizes', async () => {
    const t = await startTestApp()
    try {
      const admin = await t.login(ADMIN_PHONE)
      const res = await admin.post('/api/admin/properties').send({
        title: 'Nearby Test Homes', purpose: 'Buy', city: 'Noida', lat: 28.6, lng: 77.3,
        nearby: [{ type: 'Metro', name: 'sector 62 metro', distance: '1.1 km', lat: 28.6272, lng: 77.3649 }, { type: 'School', name: 'old school', distance: '2 km' }],
        configurations: [{ beds: 2, baths: 2, areaSqft: 900, price: 7000000 }, { beds: 3, baths: 3, areaSqft: 1300, price: 9500000 }],
      })
      assert.equal(res.status, 201, JSON.stringify(res.body))
      const p = res.body.property
      assert.equal(p.nearby[0].name, 'Sector 62 Metro')
      assert.equal(p.nearby[0].lat, 28.6272)
      assert.equal(p.nearby[1].lat ?? null, null)
      assert.deepEqual(p.configurations.map((c) => c.baths), [2, 3])
    } finally {
      await t.stop()
    }
  })
})
