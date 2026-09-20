import { config } from '../config.js'
import { Audit } from '../models/index.js'

/* --------------------------------------------------------------------- audit */
/** Who changed what — kept for a year. Never blocks or fails the request. */
export function audit(req, action, entity, entityId, meta = {}) {
  Audit.create({ userId: req.user?.id, role: req.user?.role, action, entity, entityId, meta }).catch(() => {})
}

/* ------------------------------------------------------------ rebuild webhook */
// When public content changes (listing approved, post published, settings saved …) the pre-rendered
// website has to be rebuilt so Google sees it. This debounces those changes into a single call to
// REBUILD_WEBHOOK_URL (e.g. a GitHub workflow_dispatch URL or your own deploy hook).
let timer = null
let lastRun = null

async function fire(reason) {
  if (!config.rebuildWebhookUrl) return { ok: false, skipped: true }
  try {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/vnd.github+json', 'User-Agent': 'ncr-backend' }
    if (config.rebuildWebhookToken) headers.Authorization = `Bearer ${config.rebuildWebhookToken}`
    const body = process.env.REBUILD_WEBHOOK_BODY ?? JSON.stringify({ ref: 'main', event: 'content-changed', reason })
    const res = await fetch(config.rebuildWebhookUrl, { method: 'POST', headers, body })
    lastRun = { at: new Date().toISOString(), status: res.status, reason }
    return { ok: res.ok, status: res.status }
  } catch (err) {
    lastRun = { at: new Date().toISOString(), error: err.message, reason }
    return { ok: false, error: err.message }
  }
}

export function contentChanged(reason = 'content') {
  if (!config.rebuildWebhookUrl || config.isTest) return
  clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    fire(reason)
  }, 30_000)
  timer.unref?.()
}

export const rebuildNow = (reason = 'manual') => fire(reason)
export const rebuildStatus = () => ({ configured: Boolean(config.rebuildWebhookUrl), pending: Boolean(timer), lastRun })
