import { spawn } from 'node:child_process'
import { config } from '../config.js'
import { Audit } from '../models/index.js'
import { broadcast } from './events.js'

/* --------------------------------------------------------------------- audit */
/** Who changed what — kept for a year. Never blocks or fails the request. */
export function audit(req, action, entity, entityId, meta = {}) {
  Audit.create({ userId: req.user?.id, role: req.user?.role, action, entity, entityId, meta }).catch(() => {})
}

/* ------------------------------------------------------------ rebuild trigger */
// When public content changes (listing approved, post published, settings saved …) the pre-rendered
// website has to be rebuilt so Google sees it. Changes are debounced into ONE rebuild, done by either
//   REBUILD_COMMAND      a shell command run on this server, e.g.
//                        cd /var/www/propertyinncr.com && npm run build      (needs no tokens)
//   REBUILD_WEBHOOK_URL  a URL that is POSTed (e.g. a GitHub workflow_dispatch URL / your deploy hook)
// Builds never overlap: a change that arrives while one is running schedules exactly one more.
let timer = null
let running = false
let again = false
let lastRun = null

const configured = () => Boolean(config.rebuildCommand || config.rebuildWebhookUrl)

function runCommand(reason) {
  return new Promise((resolve) => {
    const started = Date.now()
    let tail = ''
    const child = spawn(config.rebuildCommand, { shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
    const keep = (d) => { tail = (tail + d).slice(-1500) }
    child.stdout.on('data', keep)
    child.stderr.on('data', keep)
    child.on('error', (err) => resolve({ ok: false, error: err.message }))
    child.on('close', (code) => resolve({ ok: code === 0, code, seconds: Math.round((Date.now() - started) / 1000), tail: code === 0 ? undefined : tail, reason }))
  })
}

async function callWebhook(reason) {
  try {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/vnd.github+json', 'User-Agent': 'ncr-backend' }
    if (config.rebuildWebhookToken) headers.Authorization = `Bearer ${config.rebuildWebhookToken}`
    const body = process.env.REBUILD_WEBHOOK_BODY ?? JSON.stringify({ ref: 'main', event: 'content-changed', reason })
    const res = await fetch(config.rebuildWebhookUrl, { method: 'POST', headers, body })
    return { ok: res.ok, status: res.status, reason }
  } catch (err) {
    return { ok: false, error: err.message, reason }
  }
}

async function fire(reason) {
  if (!configured()) return { ok: false, skipped: true }
  if (running) {
    again = true
    return { ok: true, queued: true }
  }
  running = true
  try {
    const result = config.rebuildCommand ? await runCommand(reason) : await callWebhook(reason)
    lastRun = { at: new Date().toISOString(), ...result }
    if (!config.isTest) console.log(`[rebuild] ${result.ok ? 'done' : 'FAILED'} (${reason})${result.error ? `: ${result.error}` : ''}`)
    return result
  } finally {
    running = false
    if (again) {
      again = false
      contentChanged('queued-change')
    }
  }
}

export function contentChanged(reason = 'content') {
  // Live-updates first, instantly: other admins re-fetch their lists, and the public site (already-open tabs)
  // re-fetches so a new/changed listing appears without a refresh. The rebuild of the pre-rendered HTML (for
  // search engines and new visits) still happens on its own debounced schedule below.
  if (!config.isTest) {
    broadcast('admin', 'content:changed', { reason })
    broadcast('public', 'content:changed', { reason })
  }
  if (!configured() || config.isTest) return
  clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    fire(reason)
  }, 30_000)
  timer.unref?.()
}

export const rebuildNow = (reason = 'manual') => fire(reason)
export const rebuildStatus = () => ({ configured: configured(), mode: config.rebuildCommand ? 'command' : config.rebuildWebhookUrl ? 'webhook' : 'off', pending: Boolean(timer), running, lastRun })
