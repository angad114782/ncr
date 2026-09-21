import { z } from 'zod'
import { normalizePhone } from './phone.js'

/* ------------------------------------------------------------------ basics */
export const phone = z
  .string()
  .transform((v) => normalizePhone(v))
  .refine((v) => v.length === 10, 'Enter a valid 10-digit mobile number')

const text = (max = 200) => z.string().trim().max(max)
const optText = (max = 200) => text(max).optional()
const bool = z.preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean())
const blank = (v) => v === '' || v === null || v === undefined
const num = (min = -Infinity, max = Infinity) => z.preprocess((v) => (blank(v) ? undefined : v), z.coerce.number().min(min).max(max)).optional()
const nullableNum = (min, max) => z.preprocess((v) => (blank(v) ? null : v), z.coerce.number().min(min).max(max).nullable()).optional()
const email = z.preprocess((v) => (blank(v) ? '' : v), z.union([z.literal(''), z.string().trim().toLowerCase().email().max(200)])).optional()
const slug = z.string().trim().max(100).optional()

/** Images are stored as links only — an uploaded file is sent to /uploads first and its URL used here. */
const imageRef = z
  .string()
  .trim()
  .max(1000)
  .refine((s) => !s.startsWith('data:'), 'Upload the image first (POST /api/uploads) and use the link it returns')
  .refine((s) => /^https?:\/\//i.test(s) || s.startsWith('/'), 'Images must be a link (https://…) or an /uploads/… path')
const imageList = (max) => z.array(imageRef).max(max)
const optImage = z.preprocess((v) => (blank(v) ? '' : v), z.union([z.literal(''), imageRef])).optional()

/* -------------------------------------------------------------- properties */
const propertyBase = {
  slug,
  title: text(200).min(3, 'Title is too short'),
  type: optText(60),
  purpose: z.enum(['Buy', 'Rent']),
  price: num(0, 1e11),
  priceLabel: optText(40),
  city: text(80).min(1, 'City is required'),
  locality: optText(120),
  address: optText(300),
  lat: nullableNum(-90, 90),
  lng: nullableNum(-180, 180),
  beds: num(0, 50),
  baths: num(0, 50),
  areaSqft: num(0, 1e7),
  furnishing: optText(60),
  yearBuilt: nullableNum(1800, 2100),
  reraId: z.preprocess((v) => (blank(v) ? null : v), text(80).nullable()).optional(),
  possessionStatus: optText(60),
  videoUrl: z.preprocess((v) => (blank(v) ? '' : v), z.union([z.literal(''), z.string().trim().url().max(500)])).optional(),
  description: z.string().max(10000).optional(),
  images: imageList(15).optional(),
  floorPlans: imageList(5).optional(),
  amenities: z.array(text(80)).max(60).optional(),
  nearby: z.array(z.object({ type: optText(40), name: text(120), distance: optText(40) })).max(30).optional(),
}
const adminOnlyProperty = {
  agentId: optText(60),
  postedDate: optText(20),
  featured: bool.optional(),
  verified: bool.optional(),
  videoTour: bool.optional(),
  active: bool.optional(),
  reviewStatus: z.enum(['approved', 'pending', 'rejected']).optional(),
  reviewNote: optText(500),
}

// What an AGENT may send. Anything else (featured, verified, active, agentId, reviewStatus…) is dropped.
const { slug: _agentCannotSetSlug, ...agentBase } = propertyBase // the URL slug is generated for agents
export const agentPropertyCreate = z.object({ ...agentBase, price: z.coerce.number().positive('Enter the price in rupees (greater than 0)') })
export const agentPropertyUpdate = z.object(agentBase).partial()
export const agentPropertyImport = z.object({ items: z.array(agentPropertyCreate).min(1).max(100) })
export const adminPropertyCreate = z.object({ ...propertyBase, ...adminOnlyProperty, price: z.coerce.number().positive('Enter the price in rupees (greater than 0)') })
export const adminPropertyUpdate = z.object({ ...propertyBase, ...adminOnlyProperty }).partial()
export const propertyImport = z.object({ items: z.array(adminPropertyCreate.extend({ id: optText(60) })).min(1).max(500) })

/* ----------------------------------------------------------------- listings */
const page = { page: z.coerce.number().int().min(1).max(1000).default(1), limit: z.coerce.number().int().min(1).max(100).default(24) }
export const propertyQuery = z.object({
  ...page,
  purpose: z.enum(['Buy', 'Rent']).optional(),
  city: z.string().trim().max(80).optional(),
  type: z.string().trim().max(60).optional(),
  beds: z.coerce.number().int().min(0).max(20).optional(),
  possession: z.string().trim().max(60).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  q: z.string().trim().max(100).optional(),
  featured: z.enum(['true', 'false']).optional(),
  agentId: z.string().trim().max(60).optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'area-desc']).default('newest'),
})
export const adminPropertyQuery = z.object({
  ...page,
  q: z.string().trim().max(100).optional(),
  reviewStatus: z.enum(['approved', 'pending', 'rejected']).optional(),
  active: z.enum(['true', 'false']).optional(),
  agentId: z.string().trim().max(60).optional(),
  city: z.string().trim().max(80).optional(),
})

/* ---------------------------------------------------------------- auth / me */
export const otpSend = z.object({ phone, purpose: z.enum(['login', 'register', 'verify']) })
const consent = z.object({ accepted: z.literal(true, { error: 'Please accept to continue' }) })
export const login = z.object({ phone, otp: z.string().trim().min(4).max(8) })
export const verifyPhone = login

const looseItem = z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean(), z.null()]))
/** The visitor's on-device browsing profile — the server recomputes the intent from it. */
export const interestProfile = z
  .object({
    visits: z.coerce.number().int().min(0).max(100000),
    views: z.array(looseItem).max(30),
    searches: z.array(looseItem).max(20),
    saves: z.array(looseItem).max(30),
    compares: z.array(looseItem).max(20),
  })
  .partial()

export const register = z.object({
  phone,
  otp: z.string().trim().min(4).max(8),
  name: text(80).min(2, 'Please enter your full name'),
  role: z.enum(['user', 'agent']).default('user'),
  city: optText(80),
  agency: optText(120),
  reraId: optText(80),
  consent,
  source: z.enum(['signup', 'nudge', 'picked']).optional(),
  profile: interestProfile.optional(),
})

export const meUpdate = z.object({ name: text(80).min(2), city: optText(80), email, avatar: optImage }).partial()
export const meDelete = z.object({ confirm: z.literal(true) })
export const eventsBody = z.object({
  events: z
    .array(
      z.object({
        type: z.enum(['view', 'search', 'save', 'compare', 'visit']),
        data: looseItem.default({}),
        at: z.coerce.number().optional(),
      }),
    )
    .min(1)
    .max(100),
})

/* ------------------------------------------------------------------- leads */
export const leadCreate = z.object({
  name: text(80).min(2, 'Please enter your name'),
  phone,
  email,
  budget: optText(80),
  message: z.string().trim().max(2000).optional(),
  propertyId: optText(60),
  city: optText(80),
  source: z.enum(['contact_page', 'property_lead_form']).default('contact_page'),
  contactIntent: optText(40),
  phoneToken: z.string().max(1000).optional(),
  // "otp_sent": the visitor filled the form and a code was sent, but the number is not confirmed (yet). The lead is
  // kept — marked as not verified — so the team still sees someone who asked for a callback and never typed the code.
  stage: z.enum(['otp_sent']).optional(),
  profile: interestProfile.optional(),
})
export const leadPatch = z.object({
  status: z.enum(['Pending', 'Responded']).optional(),
  assignedAgentId: optText(60),
  note: z.string().trim().max(1000).optional(),
})
export const leadQuery = z.object({
  ...page,
  q: z.string().trim().max(100).optional(),
  status: z.enum(['Pending', 'Responded']).optional(),
  intent: z.enum(['Hot', 'Warm', 'Cold']).optional(),
  source: z.string().trim().max(40).optional(),
})

/* ------------------------------------------------------------------ agents */
export const agentProfile = z
  .object({
    name: text(80).min(2),
    role: optText(80),
    city: optText(80),
    email,
    avatar: optImage,
    agency: optText(120),
    reraId: optText(80),
    bio: z.string().trim().max(3000).optional(),
  })
  .partial()
export const agentAdmin = z
  .object({
    name: text(80).min(2),
    role: optText(80),
    city: optText(80),
    phone: z.string().trim().max(30),
    email,
    avatar: optImage,
    agency: optText(120),
    reraId: optText(80),
    bio: z.string().trim().max(3000),
    rating: num(0, 5),
    dealsClosed: num(0, 100000),
    status: z.enum(['approved', 'pending', 'rejected']),
    active: bool,
    userId: optText(60),
  })
  .partial()

/* ------------------------------------------------------------------- users */
export const userCreate = z.object({ name: text(80).min(2), phone, email, city: optText(80), role: z.enum(['user', 'agent', 'admin']).default('user'), active: bool.optional() })
export const userUpdate = z.object({ name: text(80).min(2), phone, email, city: optText(80), role: z.enum(['user', 'agent', 'admin']), active: bool, avatar: optImage }).partial()

/* ------------------------------------------------------------ content types */
export const postInput = z
  .object({
    slug,
    title: text(200).min(3),
    description: text(400),
    summary: text(600),
    category: text(60),
    author: text(80),
    cover: optImage,
    date: text(20),
    updated: text(20),
    intro: z.string().max(5000),
    body: z.string().max(200000),
    media: z.record(z.string(), imageRef).default({}),
    faqs: z.array(z.object({ question: text(300), answer: z.string().trim().max(3000) })).max(30),
    related: z.array(text(120)).max(12),
    featured: bool,
    active: bool,
  })
  .partial()
export const faqInput = z.object({ question: text(400), answer: z.string().trim().max(5000), category: optText(60), pages: z.array(z.enum(['home', 'about', 'contact'])).max(3).optional(), active: bool.optional(), order: num(0, 100000) }).partial()
export const testimonialInput = z.object({ name: text(80), city: optText(80), avatar: optImage, rating: num(0, 5), text: z.string().trim().max(1500), active: bool.optional(), order: num(0, 100000) }).partial()
export const bulkBody = z.object({ ids: z.array(z.string().max(60)).min(1).max(500), action: z.enum(['activate', 'deactivate', 'delete', 'approve', 'reject']) })
export const listQuery = z.object({ ...page, q: z.string().trim().max(100).optional(), active: z.enum(['true', 'false']).optional() })

/* ---------------------------------------------------------------- settings */
export const settingBody = z.object({ value: z.any().refine((v) => v !== null && typeof v === 'object', 'value must be an object or an array') })

export { parse } from './security.js'
