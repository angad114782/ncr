import { createHash } from 'node:crypto'
import { config } from '../config.js'
import { getSetting } from '../services/settings.js'
import { normalizePhone } from './phone.js'

const log = (...args) => {
  if (!config.isTest) console.warn('[meta-capi]', ...args)
}

const sha256 = (v) => createHash('sha256').update(v).digest('hex')
/** Meta's Advanced Matching wants lowercased/trimmed values, hashed — never sent in the clear. */
const hashEmail = (v) => sha256(String(v).trim().toLowerCase())
const hashPhone = (v) => {
  const d = normalizePhone(v)
  return d ? sha256(`91${d}`) : '' // Meta expects the number with country code, digits only
}

/**
 * Meta (Facebook/Instagram) Conversions API — the server-side twin of the browser Pixel. Sent for
 * every lead `createLead()` makes (see services/leads.js), sharing the lead's own id as `event_id`
 * with the Pixel's `fbq('track', 'Lead', …, { eventID })` call on the client so Meta deduplicates
 * the two into one conversion instead of double-counting. Best-effort: never blocks or throws on
 * failure, and does nothing at all until both the Pixel ID and a Conversions API access token are
 * set (Admin → Settings → Marketing & Ad Tracking).
 */
export async function sendMetaLeadEvent({ eventId, phone, email, name, ip, userAgent, sourceUrl, contentName }) {
  const m = await getSetting('marketing')
  if (!m.metaPixelId || !m.metaCapiAccessToken) return { ok: false, error: 'Meta Conversions API is not configured (Pixel ID / Access Token).' }

  const userData = {}
  if (phone) userData.ph = [hashPhone(phone)]
  if (email) userData.em = [hashEmail(email)]
  if (ip) userData.client_ip_address = ip
  if (userAgent) userData.client_user_agent = userAgent

  const payload = {
    data: [
      {
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: 'website',
        event_source_url: sourceUrl,
        user_data: userData,
        custom_data: { content_name: contentName },
      },
    ],
    ...(m.metaTestEventCode ? { test_event_code: m.metaTestEventCode } : {}),
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    let res
    try {
      res = await fetch(`https://graph.facebook.com/v21.0/${m.metaPixelId}/events?access_token=${encodeURIComponent(m.metaCapiAccessToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`)
    return { ok: true, eventsReceived: body?.events_received }
  } catch (err) {
    log(`Lead event for ${name || 'a visitor'} failed: ${err.message}`)
    return { ok: false, error: err.message }
  }
}
