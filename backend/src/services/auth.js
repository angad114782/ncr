import { config } from '../config.js'
import { Consent, Otp, User } from '../models/index.js'
import { badRequest, tooMany, AppError } from '../lib/errors.js'
import { generateOtp, hashOtp, safeEqual, signToken } from '../lib/security.js'
import { sendOtpMessage } from '../lib/notify.js'
import { getSetting, legalVersions } from './settings.js'

const MAX_ATTEMPTS = 5

/** What the website may know about an account. */
export const publicUser = (u) =>
  u && {
    id: u.id ?? u._id,
    name: u.name,
    phone: u.phone,
    email: u.email ?? '',
    role: u.role,
    city: u.city ?? '',
    avatar: u.avatar ?? '',
    active: u.active !== false,
    ...(u.agentId ? { agentId: u.agentId } : {}),
  }

/* --------------------------------------------------------------------- otp */
export async function issueOtp(phone, purpose, ip = '') {
  const now = Date.now()
  const [recent, fromIp] = await Promise.all([
    Otp.find({ phone, createdAt: { $gt: new Date(now - 10 * 60_000) } }).sort({ createdAt: -1 }).lean(),
    ip ? Otp.countDocuments({ ip, createdAt: { $gt: new Date(now - 60 * 60_000) } }) : 0,
  ])
  if (recent[0] && now - new Date(recent[0].createdAt).getTime() < 30_000) throw tooMany('Please wait 30 seconds before asking for another code.')
  if (recent.length >= 5) throw tooMany('Too many codes requested for this number. Try again in a few minutes.')
  if (fromIp >= 30) throw tooMany('Too many codes requested from this network. Try again later.')

  const code = generateOtp()
  const { delivered } = await sendOtpMessage(phone, code)
  if (!delivered && !config.otpDevMode) {
    throw new AppError(503, 'otp_unavailable', 'We could not send the code right now. Please try again shortly or contact us.')
  }
  await Otp.create({ phone, purpose, codeHash: hashOtp(phone, purpose, code), expiresAt: new Date(now + config.otpTtlMinutes * 60_000), ip })
  return { delivered, expiresInSeconds: config.otpTtlMinutes * 60, ...(config.otpDevMode ? { devOtp: code } : {}) }
}

/** Throws unless `code` is the live code for this phone + purpose. A code can be used once. */
export async function checkOtp(phone, purpose, code) {
  const otp = await Otp.findOne({ phone, purpose, consumed: false, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 })
  if (!otp) throw badRequest('That code has expired. Please ask for a new one.')
  if (otp.attempts >= MAX_ATTEMPTS) throw tooMany('Too many wrong attempts. Please ask for a new code.')
  await Otp.updateOne({ _id: otp._id }, { $inc: { attempts: 1 } })
  if (!safeEqual(otp.codeHash, hashOtp(phone, purpose, String(code)))) throw new AppError(400, 'incorrect_otp', 'Incorrect code. Please try again.')
  await Otp.updateOne({ _id: otp._id }, { consumed: true })
}

/* ---------------------------------------------------------------- sessions */
export function startSession(res, user) {
  const token = signToken({ sub: user.id ?? user._id, role: user.role })
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.cookieSameSite,
    maxAge: config.jwtDays * 24 * 60 * 60 * 1000,
    path: '/',
  })
  return token
}

export const endSession = (res) => res.clearCookie(config.cookieName, { httpOnly: true, secure: config.isProd, sameSite: config.cookieSameSite, path: '/' })

export async function touchLogin(user) {
  await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() })
}

/* ----------------------------------------------------------------- consent */
const getPath = (obj, dotted) => dotted.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)

/**
 * Stores proof of consent: the exact sentence shown to the person (read from the CURRENT site settings,
 * never trusted from the browser), the version of every legal page, time, IP and user-agent.
 */
export async function recordConsent(req, { phone, userId, leadId, kind, textKey, text: fixedText, source }) {
  const siteContent = await getSetting('siteContent')
  const text = fixedText ?? String(getPath(siteContent, textKey) ?? '')
  return Consent.create({
    phone,
    userId,
    leadId,
    kind,
    textKey,
    text,
    legalVersions: await legalVersions(),
    source,
    ip: req.ip,
    userAgent: String(req.get('user-agent') ?? '').slice(0, 300),
  })
}
