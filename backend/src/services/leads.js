import { Agent, Lead, Property } from '../models/index.js'
import { emptyProfile, leadInterest, summarise } from '../lib/interest.js'
import { notifyNewLead } from '../lib/notify.js'
import { recordConsent } from './auth.js'
import { getSetting } from './settings.js'

const today = () => new Date().toISOString().slice(0, 10)
const RANK = { Cold: 0, Warm: 1, Hot: 2 }
const higher = (a, b) => (RANK[a] >= RANK[b] ? a : b)

/** Who should follow up: the listing's agent if approved, otherwise an approved agent in the same city. */
async function pickAgent(property, city) {
  if (property?.agentId) {
    const a = await Agent.findById(property.agentId)
    if (a?.status === 'approved' && a.active !== false) return a
  }
  if (city) return Agent.findOne({ city, status: 'approved', active: { $ne: false } })
  return null
}

/**
 * WhatsApp (and e-mail) after a lead is saved. The visitor's welcome goes only to an enquiry form they filled in
 * (they agreed to be contacted), never twice within 24 h for the same number, and only if the admin allows it.
 * Sending is best-effort and never delays or fails the request.
 */
async function announceLead(lead, property, { team, welcome: wantWelcome, agent, enquiry, contactConsent, verified, since }) {
  let welcome = false
  if (wantWelcome && enquiry && contactConsent) {
    const wa = await getSetting('whatsapp')
    if (wa.leadWelcomeEnabled !== false && (!wa.leadWelcomeVerifiedOnly || verified)) {
      welcome = !(await Lead.exists({ phone: lead.phone, welcomeSentAt: { $gt: since } }))
      if (welcome) await Lead.updateOne({ _id: lead.id }, { $set: { welcomeSentAt: new Date() } }) // claim it first: two quick submissions send one
    }
  }
  notifyNewLead(lead, { property, agent, welcome, team })
    .then(async (sent) => {
      const update = {}
      if (sent.admin) update.$set = { adminNotifiedAt: new Date() }
      if (welcome && !sent.client) update.$unset = { welcomeSentAt: '' } // it did not go out: allow another try later
      if (Object.keys(update).length) await Lead.updateOne({ _id: lead.id }, update)
    })
    .catch(() => {})
}

/**
 * Creates a lead (or merges into a recent one) and does everything that follows: intent (recomputed
 * from the raw browsing profile — never trusted from the browser), consent proof, assignment and
 * notifications.
 *
 *   sign-up leads   → one per phone number (a returning number updates its lead)
 *   enquiries       → the same person asking about the same property within 24 h is merged
 */
export async function createLead(req, data, { user, verified = false, source, consentKind = 'enquiry', consentTextKey, contactConsent = true } = {}) {
  const phone = data.phone
  const summary = summarise(data.profile ?? emptyProfile())
  const enquiry = source === 'property_lead_form' || source === 'contact_page'
  const intent = enquiry ? higher(summary.intent, 'Warm') : summary.intent
  const interest = summary.hasSignal ? leadInterest(summary) : null

  const propertyId = data.propertyId ?? (source?.startsWith('signup') ? summary.lastViewedId : null) ?? null
  const property = propertyId ? await Property.findById(propertyId).lean() : null
  const city = data.city || property?.city || summary.city || ''

  // merge with an existing lead
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const existing = source?.startsWith('signup')
    ? await Lead.findOne({ phone, source: { $in: ['signup', 'signup-prompt'] } })
    : await Lead.findOne({ phone, propertyId: propertyId ?? null, status: 'Pending', createdAt: { $gt: since } })

  const message = data.message?.trim() || (property ? `Interested in ${property.title}.${data.budget ? ` Budget: ${data.budget}.` : ''}` : summary.hasSignal ? `New sign-up. ${summary.line}` : 'New sign-up — no browsing history yet.')

  // A code was sent for this enquiry but the number is not confirmed (yet): keep the lead, marked "not verified".
  const pending = data.stage === 'otp_sent' && !verified

  let lead
  let announce = null // what to tell whom once the lead is saved
  if (existing) {
    const wasVerified = existing.phoneVerified
    if (!existing.message.includes(message)) existing.message = `${existing.message}\n— ${today()}: ${message}`.slice(0, 4000) // the verified submit repeats the text of the "code sent" one
    existing.intent = higher(existing.intent, intent)
    if (interest) existing.interest = interest
    if (pending) existing.otpSentAt = new Date()
    if (verified) existing.phoneVerified = true
    if (user) existing.userId = user.id
    lead = await existing.save()
    // The team was told when the lead first arrived. Someone who now confirmed the number gets the welcome.
    if (verified && !wasVerified) announce = { team: false, welcome: true }
  } else {
    const agent = await pickAgent(property, city)
    lead = await Lead.create({
      otpSentAt: pending ? new Date() : null,
      propertyId,
      userId: user?.id ?? null,
      userName: data.name,
      userEmail: data.email ?? '',
      phone,
      budget: data.budget ?? (summary.budget ? `around ₹${summary.budget.toLocaleString('en-IN')}` : ''),
      city,
      message,
      date: today(),
      phoneVerified: verified,
      source,
      contactIntent: data.contactIntent ?? '',
      intent,
      interest,
      assignedAgentId: agent?.id ?? '',
    })
    // The team hears about every new lead at once — including one whose code has not been typed in. The welcome waits
    // until the number is confirmed.
    announce = { team: true, welcome: !pending, agent }
  }

  if (announce) await announceLead(lead, property, { ...announce, enquiry, contactConsent, verified, since })

  const alreadyConsented = enquiry && existing && lead.consent // the "code sent" and the "verified" submits are one enquiry: one consent record
  if (contactConsent && !alreadyConsented) {
    const consent = await recordConsent(req, {
      phone,
      userId: user?.id,
      leadId: lead.id,
      kind: consentKind,
      textKey: consentTextKey,
      text: consentTextKey ? undefined : 'By sending this enquiry I agree to be contacted by call or WhatsApp about it.',
      source,
    })
    lead.consent = true
    lead.consentId = consent.id
    await lead.save()
  }
  return lead
}
