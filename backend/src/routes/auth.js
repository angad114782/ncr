import { Router } from 'express'
import { Agent, User } from '../models/index.js'
import { AppError, conflict, forbidden, notFound } from '../lib/errors.js'
import { newId } from '../lib/ids.js'
import { audit } from '../lib/misc.js'
import { notifyTeam } from '../lib/notify.js'
import { login, otpSend, parse, register, verifyPhone } from '../lib/schemas.js'
import { signPhoneToken } from '../lib/security.js'
import { out } from '../lib/serialize.js'
import { checkOtp, endSession, issueOtp, publicUser, recordConsent, startSession, touchLogin } from '../services/auth.js'
import { createLead } from '../services/leads.js'
import { getSetting } from '../services/settings.js'
import { authLimiter, ipBlockGuard, phoneBlockGuard, requireAuth } from '../middleware/index.js'

const router = Router()
const today = () => new Date().toISOString().slice(0, 10)

/** Sends a one-time code by WhatsApp. purpose: login (account must exist), register (number must be new), verify (any number). */
router.post('/otp/send', ipBlockGuard, phoneBlockGuard, authLimiter, async (req, res) => {
  const { phone, purpose } = parse(otpSend, req.body)
  const existing = await User.findOne({ phone })
  if (purpose === 'login') {
    if (!existing) throw notFound("No account found with this number. Let's sign you up instead.")
    if (existing.active === false) throw forbidden('This account has been deactivated. Please contact support.')
  }
  if (purpose === 'register' && existing) throw conflict('An account with this number already exists. Please log in instead.', 'phone_taken')
  res.json({ ok: true, ...(await issueOtp(phone, purpose, req.ip)) })
})

router.post('/login', ipBlockGuard, phoneBlockGuard, authLimiter, async (req, res) => {
  const { phone, otp } = parse(login, req.body)
  const user = await User.findOne({ phone })
  if (!user) throw notFound("No account found with this number. Let's sign you up instead.")
  if (user.active === false) throw forbidden('This account has been deactivated. Please contact support.')
  await checkOtp(phone, 'login', otp)
  startSession(res, user)
  await touchLogin(user)
  const agent = user.role === 'agent' ? await Agent.findOne({ $or: [{ _id: user.agentId ?? '__none__' }, { userId: user.id }] }) : null
  audit({ user, ip: req.ip }, 'login', 'user', user.id)
  res.json({ user: publicUser(user), agent: agent ? out(agent) : null })
})

/**
 * Creates the account. A CLIENT (default) becomes a lead for the sales team, carrying what they looked at.
 * An AGENT gets a pending agent record that the admin approves. Both must accept the consent text.
 */
router.post('/register', ipBlockGuard, phoneBlockGuard, authLimiter, async (req, res) => {
  const d = parse(register, req.body)
  if (await User.exists({ phone: d.phone })) throw conflict('An account with this number already exists. Please log in instead.', 'phone_taken')

  const isAgent = d.role === 'agent'
  if (isAgent) {
    const program = (await getSetting('siteContent')).agentProgram
    if (program?.enabled === false) throw forbidden('Agent registration is closed right now.')
    if (!d.city) throw new AppError(400, 'validation_error', 'city: Please choose the city you work in', [{ field: 'city', message: 'Please choose the city you work in' }])
  }

  await checkOtp(d.phone, 'register', d.otp)

  const id = newId('u')
  const user = await User.create({ _id: id, name: d.name, phone: d.phone, role: isAgent ? 'agent' : 'user', city: d.city || (isAgent ? '' : 'Mumbai'), agentId: isAgent ? `a${id}` : undefined })

  let agent = null
  let lead = null
  if (isAgent) {
    agent = await Agent.create({
      _id: user.agentId,
      userId: user.id,
      name: d.name,
      city: d.city,
      phone: `+91 ${d.phone}`,
      agency: d.agency ?? '',
      reraId: d.reraId ?? '',
      status: 'pending',
      joined: today(),
    })
    await recordConsent(req, { phone: d.phone, userId: user.id, kind: 'agent-registration', textKey: 'agentProgram.consentText', source: 'signup' })
    notifyTeam('New agent registration', `${d.name} (${d.city}${d.agency ? `, ${d.agency}` : ''}) registered as an agent and is waiting for approval.`).catch(() => {})
  } else {
    lead = await createLead(req, { name: d.name, phone: d.phone, profile: d.profile }, {
      user,
      verified: true,
      source: d.source ? 'signup-prompt' : 'signup',
      consentKind: 'signup',
      consentTextKey: 'nudge.consentText',
    })
  }

  startSession(res, user)
  await touchLogin(user)
  audit({ user, ip: req.ip }, 'register', 'user', user.id, { role: user.role })
  // `leadId`: the frontend Pixel fires a matching `fbq('track', 'Lead', …, { eventID })` right after
  // this call (see AuthSheet.jsx) — sharing this id is what lets Meta dedupe it against the
  // Conversions API event createLead() already fired server-side for the same signup.
  res.status(201).json({ user: publicUser(user), agent: agent ? out(agent) : null, leadId: lead?.id ?? null })
})

/** Proves a phone number to the server without creating an account — used before a public enquiry. */
router.post('/verify-phone', ipBlockGuard, phoneBlockGuard, authLimiter, async (req, res) => {
  const { phone, otp } = parse(verifyPhone, req.body)
  await checkOtp(phone, 'verify', otp)
  res.json({ ok: true, phoneToken: signPhoneToken(phone) })
})

router.post('/logout', (_req, res) => {
  endSession(res)
  res.json({ ok: true })
})

router.get('/me', requireAuth, async (req, res) => {
  const agent = req.user.role === 'agent' ? await Agent.findOne({ $or: [{ _id: req.user.agentId ?? '__none__' }, { userId: req.user.id }] }) : null
  res.json({ user: publicUser(req.user), agent: agent ? out(agent) : null })
})

export default router
