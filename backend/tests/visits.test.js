import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ADMIN_PHONE, startTestApp } from './helpers.js'

describe('visits (real-visitor counter + admin log)', () => {
  let t, admin
  before(async () => {
    t = await startTestApp()
    admin = await t.login(ADMIN_PHONE)
  })
  after(async () => { await t.stop() })

  it('pings from the same visitor the same day merge into one row, not one per hit', async () => {
    const { Visit } = await import('../src/models/index.js')
    await Visit.deleteMany({})

    const first = await t.request.post('/api/visits/ping').send({ path: '/listings' })
    assert.equal(first.status, 200)
    assert.equal(first.body.counted, true)
    const second = await t.request.post('/api/visits/ping').send({ path: '/property/p1' })
    assert.equal(second.status, 200)

    assert.equal(await Visit.countDocuments(), 1, 'one ip, one day -> one row')
    const row = await Visit.findOne({})
    assert.equal(row.hits, 2)
    assert.equal(row.path, '/listings', 'first page seen that day is kept, not overwritten by later pings')
  })

  it('the admin\'s own browsing is never counted', async () => {
    const { Visit } = await import('../src/models/index.js')
    await Visit.deleteMany({})

    const res = await admin.post('/api/visits/ping').send({ path: '/admin' })
    assert.equal(res.status, 200)
    assert.equal(res.body.counted, false)
    assert.equal(await Visit.countDocuments(), 0)
  })

  it('the public counter reflects real (non-admin) visits only', async () => {
    const { Visit } = await import('../src/models/index.js')
    await Visit.deleteMany({})
    await t.request.post('/api/visits/ping').send({})
    await admin.post('/api/visits/ping').send({}) // must not move the counter

    const res = await t.request.get('/api/visits/count')
    assert.equal(res.status, 200)
    assert.equal(res.body.total, 1)
  })

  it('admin sees the visitor log with city/region/pincode fields, and only the admin', async () => {
    const { Visit } = await import('../src/models/index.js')
    await Visit.deleteMany({})
    await t.request.post('/api/visits/ping').send({ path: '/' })

    assert.equal((await t.request.get('/api/admin/visitors')).status, 401)

    const res = await admin.get('/api/admin/visitors')
    assert.equal(res.status, 200)
    assert.equal(res.body.items.length, 1)
    const row = res.body.items[0]
    for (const k of ['ip', 'day', 'city', 'region', 'pincode', 'country', 'path', 'hits']) assert.ok(k in row, k)
    assert.equal(typeof res.body.allTime, 'number')
    assert.equal(typeof res.body.last7Days, 'number')
    assert.ok(Array.isArray(res.body.byCity))
  })
})
