import { Agent, Lead, Property } from '../models/index.js'
import { emptyProfile, leadInterest, summarise } from '../lib/interest.js'
import { notifyNewLead } from '../lib/notify.js'
import { recordConsent } from './auth.js'

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

  let lead
  if (existing) {
    existing.message = `${existing.message}\n— ${today()}: ${message}`.slice(0, 4000)
    existing.intent = higher(existing.intent, intent)
    if (interest) existing.interest = interest
    if (verified) existing.phoneVerified = true
    if (user) existing.userId = user.id
    lead = await existing.save()
  } else {
    const agent = await pickAgent(property, city)
    lead = await Lead.create({
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
    notifyNewLead(lead, { propertyTitle: property?.title, agent }).catch(() => {})
  }

  if (contactConsent) {
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
