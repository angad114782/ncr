import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { AppError } from './errors.js'

/* ------------------------------------------------------------------ tokens */
export const signToken = (payload, expiresIn = `${config.jwtDays}d`) => jwt.sign(payload, config.jwtSecret, { expiresIn })

export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret)
  } catch {
    return null
  }
}

/** Short-lived proof that a phone number was verified with an OTP (used to submit a public enquiry). */
export const signPhoneToken = (phone) => signToken({ typ: 'phone', phone }, '15m')
export function readPhoneToken(token) {
  const p = token ? verifyToken(token) : null
  return p?.typ === 'phone' ? p.phone : ''
}

/* --------------------------------------------------------------------- otp */
export const generateOtp = () => String(crypto.randomInt(10 ** (config.otpLength - 1), 10 ** config.otpLength))

export const hashOtp = (phone, purpose, code) => crypto.createHmac('sha256', config.jwtSecret).update(`${phone}:${purpose}:${code}`).digest('hex')

export function safeEqual(a, b) {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex')

/* --------------------------------------------------------------- validation */
/** Parses `data` with a zod schema; failures become a clean 400 listing every problem. */
export function parse(schema, data) {
  const result = schema.safeParse(data ?? {})
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
    throw new AppError(400, 'validation_error', `${details[0]?.field ? `${details[0].field}: ` : ''}${details[0]?.message ?? 'Invalid input'}`, details)
  }
  return result.data
}

/** Removes keys that could be used for NoSQL operator injection ($where, a.b …) from a parsed body. */
export function stripDangerousKeys(value, depth = 0) {
  if (depth > 12 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => stripDangerousKeys(v, depth + 1))
  const out = {}
  for (const [k, v] of Object.entries(value)) {
    if (k.startsWith('$') || k.includes('.') || k === '__proto__' || k === 'constructor') continue
    out[k] = stripDangerousKeys(v, depth + 1)
  }
  return out
}

/** Escapes text so it can be used inside a RegExp (search boxes). */
export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
