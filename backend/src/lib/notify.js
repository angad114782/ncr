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

/** WhatsApp Cloud API template message. Returns true when it was accepted. */
export async function sendWhatsAppTemplate(to, template, params = [], { button } = {}) {
  const wa = await getSetting('whatsapp')
  if (!wa.phoneNumberId || !wa.accessToken || !template) return false
  const components = [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text: String(text).slice(0, 500) })) }]
  if (button) components.push({ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: String(button) }] })
  try {
    await fetchJson(`https://graph.facebook.com/v20.0/${wa.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${wa.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: `91${to}`, type: 'template', template: { name: template, language: { code: 'en' }, components } }),
    })
    return true
  } catch (err) {
    log(`WhatsApp to ${maskPhone(to)} failed: ${err.message}`)
    return false
  }
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

/** Tells the team about a new lead (WhatsApp template + e-mail, whichever is configured). */
export async function notifyNewLead(lead, { propertyTitle = '', agent } = {}) {
  const [wa, mail] = await Promise.all([getSetting('whatsapp'), getSetting('mail')])
  const summary = `${lead.userName} · ${lead.phone}${propertyTitle ? ` · ${propertyTitle}` : ''}${lead.intent ? ` · ${lead.intent}` : ''}`
  await Promise.all([
    sendWhatsAppTemplate(String(wa.displayPhone ?? '').replace(/\D/g, '').slice(-10), wa.leadNotificationTemplate, [lead.userName, lead.phone, propertyTitle || lead.source]),
    sendEmail({ to: mail.replyTo || mail.fromEmail, subject: `New lead: ${lead.userName}`, text: `${summary}\n\n${lead.message ?? ''}\n\n${lead.interest?.line ?? ''}` }),
    agent?.phone ? sendWhatsAppTemplate(String(agent.phone).replace(/\D/g, '').slice(-10), wa.leadNotificationTemplate, [lead.userName, lead.phone, propertyTitle || lead.source]) : null,
  ])
}

/** Agent registered / listing submitted / status changed → the right person is told. */
export async function notifyTeam(subject, text) {
  const mail = await getSetting('mail')
  await sendEmail({ to: mail.replyTo || mail.fromEmail, subject, text })
}

export async function notifyPerson({ phone, email }, subject, text) {
  const wa = await getSetting('whatsapp')
  await Promise.all([email ? sendEmail({ to: email, subject, text }) : null, phone ? sendWhatsAppTemplate(String(phone).replace(/\D/g, '').slice(-10), wa.leadThankYouTemplate, [text.slice(0, 200)]) : null])
}
