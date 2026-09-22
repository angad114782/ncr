import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ADMIN_PHONE, startTestApp } from './helpers.js'

const DAY = 24 * 60 * 60 * 1000

describe('search analytics (admin)', () => {
  let t, admin, riya

  before(async () => {
    t = await startTestApp()
    admin = await t.login(ADMIN_PHONE)
    riya = await t.register({ phone: '9633300001', name: 'Riya Searcher' })

    const now = Date.now()
    await riya.post('/api/me/events').send({
      events: [
        { type: 'search', data: { purpose: 'Buy', city: 'Gurugram', type: 'Apartment', q: 'Sector 50' }, at: now },
        { type: 'search', data: { purpose: 'Buy', city: 'Gurugram', type: 'Apartment', q: 'sector 50' }, at: now - DAY },
        { type: 'search', data: { purpose: 'Rent', city: 'Gurugram', type: 'Villa' }, at: now - 2 * DAY },
        { type: 'search', data: { purpose: 'Buy', city: 'Noida', type: 'Apartment', q: 'Sector 18' }, at: now - 2 * DAY },
        { type: 'search', data: { purpose: 'Buy', city: 'Noida', type: 'Apartment' }, at: now - 40 * DAY }, // outside the 30-day window
        { type: 'view', data: { id: 'p1' }, at: now }, // not a search — must not count
      ],
    })
  })
  after(async () => { await t.stop() })

  it('a non-admin cannot see it', async () => {
    assert.equal((await riya.get('/api/admin/analytics/searches')).status, 403)
  })

  it('counts only "search" events inside the window, and says the data is signed-in-only', async () => {
    const res = await admin.get('/api/admin/analytics/searches?days=30')
    assert.equal(res.status, 200)
    assert.equal(res.body.signedInOnly, true)
    assert.equal(res.body.totalSearches, 4) // the 40-day-old one and the "view" event are excluded
  })

  it('groups by city, most-searched first', async () => {
    const res = await admin.get('/api/admin/analytics/searches?days=30')
    const gurugram = res.body.byCity.find((c) => c.label === 'Gurugram')
    const noida = res.body.byCity.find((c) => c.label === 'Noida')
    assert.equal(gurugram.count, 3)
    assert.equal(noida.count, 1)
    assert.equal(res.body.byCity[0].label, 'Gurugram')
  })

  it('groups by property type and by purpose too', async () => {
    const res = await admin.get('/api/admin/analytics/searches?days=30')
    assert.equal(res.body.byType.find((t) => t.label === 'Apartment').count, 3)
    assert.equal(res.body.byType.find((t) => t.label === 'Villa').count, 1)
    assert.equal(res.body.byPurpose.find((p) => p.label === 'Buy').count, 3)
    assert.equal(res.body.byPurpose.find((p) => p.label === 'Rent').count, 1)
  })

  it('top free-text queries are case-insensitively de-duplicated', async () => {
    const res = await admin.get('/api/admin/analytics/searches?days=30')
    const sector50 = res.body.topQueries.find((q) => q.q === 'sector 50')
    assert.ok(sector50, 'both "Sector 50" and "sector 50" should merge into one entry')
    assert.equal(sector50.count, 2)
  })

  it('the trend has one entry per day in the window, zero-filled where nothing happened', async () => {
    const res = await admin.get('/api/admin/analytics/searches?days=30')
    assert.equal(res.body.trend.length, 30)
    const today = new Date().toISOString().slice(0, 10)
    assert.equal(res.body.trend.at(-1).date, today)
    assert.equal(res.body.trend.at(-1).count, 1) // today's 1 search (the "view" event doesn't count)
    const totalFromTrend = res.body.trend.reduce((s, d) => s + d.count, 0)
    assert.equal(totalFromTrend, res.body.totalSearches)
  })

  it('the days window is clamped to a sane 7-90 range', async () => {
    assert.equal((await admin.get('/api/admin/analytics/searches?days=1')).body.days, 7)
    assert.equal((await admin.get('/api/admin/analytics/searches?days=9999')).body.days, 90)
  })
})
