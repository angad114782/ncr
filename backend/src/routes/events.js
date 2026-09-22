import { Router } from 'express'
import { Agent } from '../models/index.js'
import { subscribe } from '../lib/events.js'

const router = Router()

/**
 * Live updates (Server-Sent Events) — GET /api/events. Open once per browser tab; stays connected and receives
 * `event:`-named pushes as things change elsewhere (a new lead, a listing approved, a setting saved…), instead
 * of the visitor having to refresh. Anyone can connect (so the public site can live-update too); who is signed
 * in only decides which extra events are sent to that connection:
 *   - everyone: 'public' (a listing goes live, site content changes)
 *   - admin:    also 'admin' (new lead, a listing needs review, another admin/agent's change)
 *   - agent:    also 'agent:<their own agentId>' (their listing's review status, their own leads)
 * Authentication is the same cookie/token as any other request (see `authenticate` middleware) — nothing extra
 * to set up on the client beyond opening the connection with credentials.
 */
router.get('/', async (req, res) => {
  const scopes = ['public']
  if (req.user?.role === 'admin') scopes.push('admin')
  if (req.user?.role === 'agent') {
    const agent = await Agent.findOne({ $or: [{ _id: req.user.agentId ?? '__none__' }, { userId: req.user.id }] }).select('_id').lean()
    if (agent) scopes.push(`agent:${agent._id}`)
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // nginx: don't buffer this response (see also deploy/nginx-api.snippet.conf.template)
  })
  res.write(`event: ready\ndata: ${JSON.stringify({ scopes })}\n\n`)

  const cleanup = subscribe(res, scopes)
  req.on('close', cleanup)
})

export default router
