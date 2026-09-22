import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ADMIN_PHONE, startTestApp } from './helpers.js'

describe('IP geolocation (lib/geo.js)', () => {
  let realFetch, geoForIp

  before(async () => {
    ;({ geoForIp } = await import('../src/lib/geo.js'))
    realFetch = globalThis.fetch
  })
  after(() => {
    globalThis.fetch = realFetch
  })

  it('a private/local IP is never looked up', async () => {
    let called = false
    globalThis.fetch = async () => {
      called = true
      throw new Error('should not be called')
    }
    for (const ip of ['127.0.0.1', '::1', '10.0.0.5', '192.168.1.1']) assert.equal(await geoForIp(ip), null, ip)
    assert.equal(called, false)
  })

  it('a public IP is looked up and parsed', async () => {
    let calls = 0
    globalThis.fetch = async (url) => {
      calls++
      assert.match(url, /ip-api\.com\/json\/203\.0\.113\.9/)
      return { json: async () => ({ status: 'success', city: 'Gurugram', regionName: 'Haryana', zip: '122001', country: 'India' }) }
    }
    const geo = await geoForIp('203.0.113.9')
    assert.deepEqual(geo, { city: 'Gurugram', region: 'Haryana', pincode: '122001', country: 'India' })
    assert.equal(calls, 1)
  })

  it('the same IP is cached — a second lookup does not call the service again', async () => {
    let calls = 0
    globalThis.fetch = async () => { calls++; return { json: async () => ({ status: 'success', city: 'Pune', regionName: 'Maharashtra', zip: '411001', country: 'India' }) } }
    const a = await geoForIp('203.0.113.10')
    const b = await geoForIp('203.0.113.10')
    assert.deepEqual(a, b)
    assert.equal(calls, 1)
  })

  it('a failed lookup resolves to null, never throws', async () => {
    globalThis.fetch = async () => { throw new Error('network down') }
    assert.equal(await geoForIp('203.0.113.11'), null)
  })
})

describe('per-user activity (admin)', () => {
  let t, admin, riya

  before(async () => {
    t = await startTestApp()
    admin = await t.login(ADMIN_PHONE)
    riya = await t.register({ phone: '9611100001', name: 'Riya Activity' })
  })
  after(async () => { await t.stop() })

  it('only a signed-in person can post their own events, and only an admin can read them back', async () => {
    assert.equal((await t.request.post('/api/me/events').send({ events: [{ type: 'search', data: { q: 'x' } }] })).status, 401)
    assert.equal((await riya.get(`/api/admin/users/${riya.registered.user.id}/activity`)).status, 403)
  })

  it('events posted by the visitor show up for the admin, newest first, with an IP recorded', async () => {
    await riya.post('/api/me/events').send({
      events: [
        { type: 'search', data: { city: 'Gurugram', type: 'Apartment' } },
        { type: 'save', data: { propertyId: 'p1' } },
        { type: 'compare', data: { propertyId: 'p2' } },
      ],
    })
    const res = await admin.get(`/api/admin/users/${riya.registered.user.id}/activity`)
    assert.equal(res.status, 200)
    assert.equal(res.body.user.name, 'Riya Activity')
    assert.equal(res.body.items.length, 3)
    assert.deepEqual(res.body.items.map((e) => e.type), ['compare', 'save', 'search'], 'newest first')
    assert.ok(res.body.items.every((e) => e.ip), 'every event carries the IP it was seen from')
  })

  it('a second visit adds to the SAME timeline (full history, not just the latest)', async () => {
    await riya.post('/api/me/events').send({ events: [{ type: 'view', data: { propertyId: 'p3' } }] })
    const res = await admin.get(`/api/admin/users/${riya.registered.user.id}/activity`)
    assert.equal(res.body.total, 4)
    assert.equal(res.body.items[0].type, 'view')
  })

  it('paginates (limit)', async () => {
    const res = await admin.get(`/api/admin/users/${riya.registered.user.id}/activity?limit=2&page=1`)
    assert.equal(res.body.items.length, 2)
    assert.equal(res.body.pages, 2)
  })

  it('a user with no activity yet gets an empty list, not an error', async () => {
    const fresh = await t.register({ phone: '9611100002', name: 'No Activity Yet' })
    const res = await admin.get(`/api/admin/users/${fresh.registered.user.id}/activity`)
    assert.equal(res.status, 200)
    assert.deepEqual(res.body.items, [])
  })

  it('an unknown user id is a clean 404', async () => {
    assert.equal((await admin.get('/api/admin/users/does-not-exist/activity')).status, 404)
  })
})
