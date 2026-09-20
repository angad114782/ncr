import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { config } from '../config.js'
import { LegalVersion, Setting } from '../models/index.js'
import { badRequest } from '../lib/errors.js'

/**
 * Site settings live in the `settings` collection, one document per key:
 *   company · siteContent (incl. legal pages, nudge, agentProgram, seo…) · ticker · topBanner ·
 *   cities · propertyTypes · marketing · whatsapp · mail
 * Anything missing in the database falls back to the same defaults the website ships with
 * (loaded from the website's src/data/*.js when this folder sits next to it).
 */
export const SETTING_KEYS = ['company', 'siteContent', 'ticker', 'topBanner', 'cities', 'propertyTypes', 'marketing', 'whatsapp', 'mail']

const FALLBACK = {
  company: { name: 'NCR Estates', domain: 'propertyinncr.com', tagline: 'Verified homes to buy or rent across India', ceo: { name: 'Angad Yadav', title: 'CEO', experienceYears: 5 } },
  siteContent: {},
  cities: ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai', 'Gurugram'],
  propertyTypes: ['Apartment', 'Villa', 'Commercial', 'Studio', 'Penthouse', 'House'],
}

const STATIC_DEFAULTS = {
  topBanner: { enabled: false, text: '', linkLabel: '', link: '' },
  ticker: {
    enabled: true,
    speed: 'normal',
    messages: [
      { text: 'Free site visits — no obligation, no pressure', link: '/contact?intent=buy' },
      { text: 'Check RERA before you pay — read our free 2-minute guide', link: '/blog/how-to-check-rera-registration' },
      { text: 'Not sure of your budget? Get a free home-loan estimate', link: '/' },
      { text: 'Want us to call you back? Talk to an expert today', link: '/contact' },
    ],
  },
  marketing: { metaPixelId: '', googleAdsId: '', googleAdsConversionLabel: '' },
  whatsapp: {
    displayPhone: '8619930583',
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
    otpTemplate: 'otp_verification',
    leadNotificationTemplate: 'lead_notification',
    leadThankYouTemplate: 'lead_thank_you',
    webhookVerifyToken: '',
  },
  mail: {
    smtpHost: '',
    smtpPort: '587',
    smtpUsername: 'info@propertyinncr.com',
    smtpPassword: '',
    encryption: 'TLS',
    fromEmail: 'info@propertyinncr.com',
    fromName: 'NCR Estates',
    replyTo: 'info@propertyinncr.com',
  },
}

/** Fields that must never leave the server. */
const SECRETS = { whatsapp: ['accessToken', 'webhookVerifyToken'], mail: ['smtpPassword'] }

let defaultsPromise
export function loadDefaults() {
  defaultsPromise ??= (async () => {
    const dir = path.resolve(config.root, '..', 'src', 'data')
    const load = async (file, pick, fallback) => {
      try {
        const mod = await import(pathToFileURL(path.join(dir, file)).href)
        return mod[pick] ?? fallback
      } catch {
        return fallback
      }
    }
    return {
      ...STATIC_DEFAULTS,
      company: await load('company.js', 'COMPANY_DEFAULTS', FALLBACK.company),
      siteContent: await load('siteDefaults.js', 'SITE_DEFAULTS', FALLBACK.siteContent),
      cities: await load('taxonomy.js', 'DEFAULT_CITIES', FALLBACK.cities),
      propertyTypes: await load('taxonomy.js', 'DEFAULT_PROPERTY_TYPES', FALLBACK.propertyTypes),
    }
  })()
  return defaultsPromise
}

const isPlain = (v) => v && typeof v === 'object' && !Array.isArray(v)
/** Fills gaps in saved data with defaults (arrays and primitives from `saved` win) — same as the website. */
export function deepMerge(base, saved) {
  if (saved === undefined || saved === null) return base
  if (isPlain(base) && isPlain(saved)) {
    const out = { ...base }
    for (const k of Object.keys(saved)) out[k] = k in base ? deepMerge(base[k], saved[k]) : saved[k]
    return out
  }
  return saved
}

/** Every setting, merged with defaults. Includes secrets — for server-side use only. */
export async function getAllSettings() {
  const [defaults, docs] = await Promise.all([loadDefaults(), Setting.find({ _id: { $in: SETTING_KEYS } }).lean()])
  const saved = Object.fromEntries(docs.map((d) => [d._id, d.value]))
  return Object.fromEntries(SETTING_KEYS.map((k) => [k, deepMerge(defaults[k], saved[k])]))
}

export const getSetting = async (key) => (await getAllSettings())[key]

/** What the public website may see. */
export async function publicSettings() {
  const s = await getAllSettings()
  return {
    company: s.company,
    siteContent: s.siteContent,
    cities: s.cities,
    propertyTypes: s.propertyTypes,
    ticker: s.ticker,
    topBanner: s.topBanner,
    marketing: s.marketing,
    whatsapp: { displayPhone: s.whatsapp.displayPhone },
    mail: { fromEmail: s.mail.fromEmail, fromName: s.mail.fromName },
  }
}

/** Everything the admin panel edits — secrets are replaced by "has…" flags. */
export async function adminSettings() {
  const s = await getAllSettings()
  const out = { ...s, whatsapp: { ...s.whatsapp }, mail: { ...s.mail } }
  for (const [key, fields] of Object.entries(SECRETS)) {
    for (const f of fields) {
      out[key][`has${f[0].toUpperCase()}${f.slice(1)}`] = Boolean(s[key][f])
      out[key][f] = ''
    }
  }
  return out
}

/** Stores one setting. A blank secret keeps the stored one, so the admin form never has to resend it. */
export async function saveSetting(key, value, user) {
  if (!SETTING_KEYS.includes(key)) throw badRequest(`Unknown setting "${key}".`)
  const current = await getSetting(key)
  let next = value
  if (SECRETS[key]) {
    next = { ...value }
    for (const f of SECRETS[key]) {
      if (!next[f]) next[f] = current[f] ?? ''
      delete next[`has${f[0].toUpperCase()}${f.slice(1)}`]
    }
  }

  // Keep a history of every legal text that changed (privacy / terms / disclaimer).
  if (key === 'siteContent') {
    for (const kind of ['privacy', 'terms', 'disclaimer']) {
      const before = JSON.stringify(current.legal?.[kind] ?? null)
      const after = JSON.stringify(next.legal?.[kind] ?? null)
      if (after !== 'null' && before !== after) {
        await LegalVersion.create({ kind, snapshot: next.legal[kind], updatedDate: next.legal[kind]?.updated ?? '', changedBy: user?.id })
      }
    }
  }

  await Setting.findByIdAndUpdate(key, { value: next, updatedBy: user?.id }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true })
  return key === 'whatsapp' || key === 'mail' ? (await adminSettings())[key] : next
}

/** The version label of each legal page — stored with every consent so we can prove what was accepted. */
export async function legalVersions() {
  const { siteContent } = await getAllSettings()
  return Object.fromEntries(['privacy', 'terms', 'disclaimer'].map((k) => [k, siteContent.legal?.[k]?.updated ?? '']))
}
