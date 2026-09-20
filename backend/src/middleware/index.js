import rateLimit from 'express-rate-limit'
import { ZodError } from 'zod'
import mongoose from 'mongoose'
import { config } from '../config.js'
import { AppError, forbidden, unauthorized } from '../lib/errors.js'
import { stripDangerousKeys, verifyToken } from '../lib/security.js'
import { Agent, User } from '../models/index.js'

/* ------------------------------------------------------------------- input */
/** Drops `$…` / dotted keys from JSON bodies so they can never become database operators. */
export function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === 'object') req.body = stripDangerousKeys(req.body)
  next()
}

/**
 * CSRF guard for cookie sessions: a browser always sends `Origin` on a cross-site POST / PATCH / DELETE,
 * so a state-changing request from a site that isn't on the allow-list is refused. (Requests with no
 * Origin — curl, servers — carry no browser cookie, so they are not a CSRF risk.)
 */
export function originGuard(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  const origin = req.get('origin')
  if (origin && !config.clientOrigins.includes(origin)) return next(forbidden('Requests from this website are not allowed.'))
  next()
}

/* -------------------------------------------------------------------- auth */
/** Attaches `req.user` when a valid session (cookie) or `Authorization: Bearer` token is present. */
export async function authenticate(req, _res, next) {
  try {
    const header = req.get('authorization') ?? ''
    const token = req.cookies?.[config.cookieName] ?? (header.startsWith('Bearer ') ? header.slice(7) : '')
    const payload = token ? verifyToken(token) : null
    if (payload?.sub && !payload.typ) {
      const user = await User.findById(payload.sub)
      if (user && user.active !== false) req.user = user
    }
    next()
  } catch (err) {
    next(err)
  }
}

export function requireAuth(req, _res, next) {
  next(req.user ? undefined : unauthorized())
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(unauthorized())
  if (!roles.includes(req.user.role)) return next(forbidden())
  next()
}

/** Loads the signed-in agent's own agent record (creating a pending one for an admin-made agent user). */
export async function loadAgent(req, _res, next) {
  try {
    let agent = await Agent.findOne({ $or: [{ _id: req.user.agentId ?? '__none__' }, { userId: req.user.id }] })
    if (!agent) {
      agent = await Agent.create({
        _id: req.user.agentId ?? `a${req.user.id}`,
        userId: req.user.id,
        name: req.user.name,
        city: req.user.city ?? '',
        phone: `+91 ${req.user.phone}`,
        avatar: req.user.avatar ?? '',
        status: 'pending',
        joined: new Date().toISOString().slice(0, 10),
      })
    }
    req.agent = agent
    next()
  } catch (err) {
    next(err)
  }
}

/* ------------------------------------------------------------ rate limiting */
const limiter = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => config.isTest,
    handler: (_req, res) => res.status(429).json({ error: { code: 'rate_limited', message } }),
  })

export const globalLimiter = limiter(15 * 60_000, 600, 'Too many requests. Please slow down.')
export const authLimiter = limiter(15 * 60_000, 40, 'Too many attempts. Please try again in a few minutes.')
export const leadLimiter = limiter(60 * 60_000, 20, 'Too many enquiries from this network. Please try again later.')
export const uploadLimiter = limiter(60 * 60_000, 120, 'Too many uploads. Please try again later.')

/* ------------------------------------------------------------------ errors */
export function notFoundHandler(req, _res, next) {
  next(new AppError(404, 'not_found', `No such endpoint: ${req.method} ${req.path}`))
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.status ?? err.statusCode ?? 500
  let code = err.code && typeof err.code === 'string' ? err.code : 'server_error'
  let message = err.message
  let details = err.details

  if (err instanceof ZodError) {
    status = 400
    code = 'validation_error'
    details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
    message = 'Some fields are not valid.'
  } else if (err.type === 'entity.parse.failed') {
    status = 400
    code = 'bad_json'
    message = 'The request body is not valid JSON.'
  } else if (err.type === 'entity.too.large') {
    status = 413
    code = 'too_large'
    message = 'The request is too large.'
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400
    code = 'validation_error'
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }))
    message = 'Some fields are not valid.'
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400
    code = 'bad_request'
    message = 'Invalid value.'
  } else if (err?.code === 11000) {
    status = 409
    code = 'duplicate'
    message = `That ${Object.keys(err.keyPattern ?? {})[0] ?? 'value'} is already in use.`
  } else if (err.name === 'MulterError') {
    status = 400
    code = 'upload_error'
    message = err.code === 'LIMIT_FILE_SIZE' ? 'That file is too large (max 8 MB).' : err.message
  }

  if (status >= 500 && !(err instanceof AppError)) {
    if (!config.isTest) console.error('[error]', err)
    code = 'server_error'
    message = 'Something went wrong on our side. Please try again.'
    details = undefined
  }
  res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } })
}
