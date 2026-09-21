import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const bool = (v, d = false) => (v === undefined || v === '' ? d : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase()))
const list = (v) => String(v ?? '').split(',').map((s) => s.trim()).filter(Boolean)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const env = process.env.NODE_ENV ?? 'development'
const isProd = env === 'production'

export const config = {
  env,
  isProd,
  isTest: env === 'test',
  port: Number(process.env.PORT) || 5010,
  mongoUri: process.env.MONGODB_URI ?? '',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtDays: Number(process.env.JWT_EXPIRES_DAYS) || 7,
  cookieName: 'ncr_token',
  cookieSameSite: process.env.COOKIE_SAMESITE ?? 'lax', // 'none' only if the site and the API are on different domains
  clientOrigins: list(process.env.CLIENT_ORIGINS ?? 'http://localhost:5173'),
  publicApiUrl: (process.env.PUBLIC_API_URL ?? '').replace(/\/+$/, ''),
  otpDevMode: bool(process.env.OTP_DEV_MODE, false),
  otpLength: Number(process.env.OTP_LENGTH) || 6,
  otpTtlMinutes: Number(process.env.OTP_TTL_MINUTES) || 5,
  rebuildWebhookUrl: process.env.REBUILD_WEBHOOK_URL ?? '',
  rebuildWebhookToken: process.env.REBUILD_WEBHOOK_TOKEN ?? '',
  rebuildCommand: process.env.REBUILD_COMMAND ?? '', // e.g. cd /var/www/propertyinncr.com && npm run build
  adminPhone: process.env.ADMIN_PHONE ?? '8619930583',
  adminName: process.env.ADMIN_NAME ?? 'Admin User',
  uploadDir: process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(root, 'uploads'),
  root,
}

/** Refuses to start in production with unsafe settings. */
export function assertConfig() {
  const problems = []
  if (!config.mongoUri) problems.push('MONGODB_URI is not set')
  if (config.jwtSecret.length < 32) problems.push('JWT_SECRET must be at least 32 characters')
  if (config.isProd && config.otpDevMode) problems.push('OTP_DEV_MODE must be false in production (it returns the OTP in the API response)')
  if (config.isProd && config.clientOrigins.length === 0) problems.push('CLIENT_ORIGINS is empty')
  if (problems.length) throw new Error(`Invalid configuration:\n - ${problems.join('\n - ')}`)
}
