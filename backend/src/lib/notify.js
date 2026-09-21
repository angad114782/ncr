import nodemailer from 'nodemailer'
import { config } from '../config.js'
import { getSetting } from '../services/settings.js'
import { maskPhone } from './phone.js'

// Messages are best-effort: a failed WhatsApp / e-mail never fails the request that triggered it.
// Nothing here logs message bodies or full phone numbers.

const log = (...args) => {
  if (!config.isTest) console.warn('[notify]', ...args)
}

async function fetchJson(url, options, timeoutMs = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`)
    return body
  } finally {
    clearTimeout(timer)
  }
}

/** A template variable: one line, no runs of spaces, never empty (WhatsApp rejects all three). */
const cleanParam = (v) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, 500) || '-'
const last10 = (v) => String(v ?? '').replace(/\D/g, '').slice(-10)

/**
 * WhatsApp Cloud API template message. Resolves to `{ ok, error }` — the reason is what Meta answered
 * (for example "Template name does not exist"), so a broken setup can be diagnosed instead of failing silently.
 */
export async function whatsappSend(to, template, params = [], { button } = {}) {
  const wa = await getSetting('whatsapp')
  if (!wa.phoneNumberId || !wa.accessToken) return { ok: false, error: 'WhatsApp is not configured (Phone Number ID / Access Token).' }
  if (!template) return { ok: false, error: 'No template name is set for this message.' }
  if (!/^\d{10}$/.test(String(to))) return { ok: false, error: 'No valid 10-digit phone number to send to.' }
  const components = [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text: cleanParam(text) })) }]
  if (button) components.push({ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: String(button) }] })
  try {
    await fetchJson(`https://graph.facebook.com/v20.0/${wa.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${wa.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: `91${to}`, type: 'template', template: { name: template, language: { code: 'en' }, components } }),
    })
    return { ok: true }
  } catch (err) {
    log(`WhatsApp "${template}" to ${maskPhone(to)} failed: ${err.message}`)
    return { ok: false, error: err.message }
  }
}

/** Same, when only "was it accepted?" matters. */
export async function sendWhatsAppTemplate(to, template, params = [], options) {
  return (await whatsappSend(to, template, params, options)).ok
}

let transporter
let transporterKey = ''
async function mailer() {
  const m = await getSetting('mail')
  if (!m.smtpHost || !m.smtpPassword) return null
  const key = `${m.smtpHost}:${m.smtpPort}:${m.smtpUsername}:${m.encryption}`
  if (!transporter || key !== transporterKey) {
    transporter = nodemailer.createTransport({
      host: m.smtpHost,
      port: Number(m.smtpPort) || 587,
      secure: m.encryption === 'SSL' || Number(m.smtpPort) === 465,
      auth: { user: m.smtpUsername, pass: m.smtpPassword },
    })
    transporterKey = key
  }
  return { transporter, from: `"${m.fromName}" <${m.fromEmail}>`, replyTo: m.replyTo }
}

export async function sendEmail({ to, subject, text }) {
  try {
    const m = await mailer()
    if (!m || !to) return false
    await m.transporter.sendMail({ from: m.from, replyTo: m.replyTo, to, subject, text })
    return true
  } catch (err) {
    log(`e-mail failed: ${err.message}`)
    return false
  }
}

/** Sends the login / sign-up code. `delivered` is false when no WhatsApp provider is configured. */
export async function sendOtpMessage(phone, code) {
  const wa = await getSetting('whatsapp')
  const ok = await sendWhatsAppTemplate(phone, wa.otpTemplate, [code], { button: code })
  if (!ok && !config.isProd && !config.isTest) console.warn(`[otp] no WhatsApp provider configured — code for ${maskPhone(phone)} is only returned in the API response (OTP_DEV_MODE)`)
  return { delivered: ok, channel: ok ? 'whatsapp' : 'none' }
}

/** What the lead was about, in words that read well inside the visitor's thank-you sentence. */
const CONTACT_TOPIC = { buy: 'buying a property', rent: 'renting a property', sell: 'selling or listing your property', invest: 'property investment' }
export function leadTopic(lead, property) {
  if (property?.title) return property.title
  if (CONTACT_TOPIC[lead.contactIntent]) return CONTACT_TOPIC[lead.contactIntent]
  return lead.source?.startsWith('signup') ? 'your property search' : 'your property requirement'
}

/** The same, for the team: the property, or what the contact form / sign-up was about. */
function teamInterest(lead, property) {
  if (property?.title) return property.title
  if (CONTACT_TOPIC[lead.contactIntent]) return CONTACT_TOPIC[lead.contactIntent].replace(/^./, (c) => c.toUpperCase())
  return lead.source?.startsWith('signup') ? 'New sign-up' : 'General enquiry'
}

/** The live page the lead came from: the property's page, else the contact page (or the home page for a sign-up). */
export function leadPageUrl(lead, property) {
  const base = config.siteUrl
  if (property) return `${base}/property/${property.slug || property._id}`
  return lead.source === 'contact_page' ? `${base}/contact` : base
}

/** Who on the team gets the WhatsApp: the site's WhatsApp number and the admin's login number (once each). */
export async function adminNumbers() {
  const wa = await getSetting('whatsapp')
  return [...new Set([last10(wa.displayPhone), last10(config.adminPhone)].filter((n) => n.length === 10))]
}

/**
 * A lead. Team (`team`, default): the admin numbers and the assigned agent get the `lead_notification` WhatsApp —
 * name, mobile, project interest with the live link of the page, budget, location — and the team gets an e-mail.
 * Visitor (`welcome`): the person who filled the form gets the `lead_thank_you` welcome (name, what they asked about,
 * the number to call). Every part is best-effort and independent.
 * Resolves to `{ admin, client }` (was a WhatsApp accepted for the team / for the visitor).
 */
export async function notifyNewLead(lead, { property = null, agent, welcome = false, team = true } = {}) {
  const [wa, mail] = await Promise.all([getSetting('whatsapp'), getSetting('mail')])
  const url = leadPageUrl(lead, property)
  const location = (property ? [property.locality, property.city].filter(Boolean).join(', ') : '') || lead.city || 'Not shared'
  const teamParams = [lead.userName, lead.phone, `${teamInterest(lead, property)} - ${url}`, lead.budget || 'Not shared', location]
  const numbers = team ? await adminNumbers() : []
  const agentPhone = team ? last10(agent?.phone) : ''
  const callNumber = last10(wa.displayPhone) || last10(config.adminPhone)
  const summary = `${lead.userName} · ${lead.phone}${property ? ` · ${property.title}` : ''}${lead.intent ? ` · ${lead.intent}` : ''}`
  const [adminResults, , agentResult, clientResult] = await Promise.all([
    Promise.all(numbers.map((n) => whatsappSend(n, wa.leadNotificationTemplate, teamParams))),
    team ? sendEmail({ to: mail.replyTo || mail.fromEmail, subject: `New lead: ${lead.userName}`, text: `${summary}\n${url}\n\n${lead.message ?? ''}\n\n${lead.interest?.line ?? ''}` }) : null,
    agentPhone.length === 10 && !numbers.includes(agentPhone) ? whatsappSend(agentPhone, wa.leadNotificationTemplate, teamParams) : null,
    welcome ? whatsappSend(last10(lead.phone), wa.leadThankYouTemplate, [String(lead.userName).trim().split(/\s+/)[0], leadTopic(lead, property), callNumber ? `+91 ${callNumber}` : 'our team']) : null,
  ])
  return { admin: adminResults.some((r) => r.ok) || Boolean(agentResult?.ok), client: Boolean(clientResult?.ok) }
}

/** Agent registered / listing submitted / status changed → the right person is told. */
export async function notifyTeam(subject, text) {
  const mail = await getSetting('mail')
  await sendEmail({ to: mail.replyTo || mail.fromEmail, subject, text })
}

/** Agent account / listing status changes: e-mail always; WhatsApp only when an "account update" template is set. */
export async function notifyPerson({ phone, email }, subject, text) {
  const wa = await getSetting('whatsapp')
  await Promise.all([email ? sendEmail({ to: email, subject, text }) : null, phone && wa.accountUpdateTemplate ? sendWhatsAppTemplate(last10(phone), wa.accountUpdateTemplate, [text.slice(0, 200)]) : null])
}
