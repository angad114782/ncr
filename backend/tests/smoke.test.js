import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { startTestApp } from './helpers.js'

describe('smoke', () => {
  let t
  before(async () => { t = await startTestApp() })
  after(async () => { await t.stop() })

  it('health', async () => {
    const res = await t.request.get('/api/health')
    assert.equal(res.status, 200)
    assert.equal(res.body.database, 'connected')
    assert.equal(res.body.service, 'ncr-api', 'lets a deploy tell this API apart from another app on the same port')
  })

  it('bootstrap returns the seeded site', async () => {
    const res = await t.request.get('/api/public/bootstrap')
    assert.equal(res.status, 200)
    assert.equal(res.body.properties.length, 14)
    assert.equal(res.body.agents.length >= 3, true)
    assert.ok(res.body.settings.siteContent.legal.privacy.sections.length > 3)
    assert.equal(res.body.properties[0].slug.length > 3, true)
  })
})
