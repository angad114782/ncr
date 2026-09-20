import mongoose from 'mongoose'
import { makeSchema, model } from '../lib/schema.js'

const { Mixed } = mongoose.Schema.Types
const str = (extra = {}) => ({ type: String, trim: true, ...extra })

/* -------------------------------------------------------------------- users */
export const User = model(
  'User',
  makeSchema(
    {
      name: str({ required: true }),
      phone: str({ required: true, unique: true }),
      email: str({ default: '' }),
      role: { type: String, enum: ['user', 'agent', 'admin'], default: 'user', index: true },
      city: str({ default: '' }),
      avatar: str({ default: '' }),
      active: { type: Boolean, default: true },
      agentId: str(), // agents only
      lastLoginAt: Date,
    },
    { prefix: 'u' },
  ),
)

/* ------------------------------------------------------------------- agents */
export const Agent = model(
  'Agent',
  makeSchema(
    {
      userId: str({ index: true }),
      name: str({ required: true }),
      role: str({ default: 'Property Consultant' }),
      city: str({ default: '' }),
      phone: str({ default: '' }),
      email: str({ default: '' }),
      avatar: str({ default: '' }),
      rating: { type: Number, default: 0, min: 0, max: 5 },
      dealsClosed: { type: Number, default: 0, min: 0 },
      status: { type: String, enum: ['approved', 'pending', 'rejected'], default: 'pending', index: true },
      bio: str({ default: '' }),
      agency: str({ default: '' }),
      reraId: str({ default: '' }),
      joined: str({ default: '' }),
      active: { type: Boolean, default: true },
    },
    { prefix: 'a' },
  ),
)

/* --------------------------------------------------------------- properties */
export const Property = model(
  'Property',
  makeSchema(
    {
      slug: str({ required: true, unique: true, lowercase: true }),
      previousSlugs: { type: [String], default: undefined, index: true },
      title: str({ required: true }),
      type: str({ default: 'Apartment' }),
      purpose: { type: String, enum: ['Buy', 'Rent'], default: 'Buy', index: true },
      price: { type: Number, required: true, min: 0 },
      priceLabel: str({ default: '' }),
      city: str({ required: true, index: true }),
      locality: str({ default: '' }),
      address: str({ default: '' }),
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      beds: { type: Number, default: 0 },
      baths: { type: Number, default: 0 },
      areaSqft: { type: Number, default: 0 },
      furnishing: str({ default: '' }),
      yearBuilt: { type: Number, default: null },
      agentId: str({ default: '', index: true }),
      featured: { type: Boolean, default: false },
      verified: { type: Boolean, default: false },
      reraId: { type: String, default: null },
      possessionStatus: str({ default: '' }),
      videoTour: { type: Boolean, default: false },
      videoUrl: str({ default: '' }),
      postedDate: str({ default: '' }),
      description: { type: String, default: '' },
      images: { type: [String], default: [] },
      floorPlans: { type: [String], default: [] },
      amenities: { type: [String], default: [] },
      nearby: { type: [{ _id: false, type: { type: String }, name: String, distance: String }], default: [] },
      active: { type: Boolean, default: true },
      // Listings posted by agents wait here until the admin approves them (missing = approved).
      reviewStatus: { type: String, enum: ['approved', 'pending', 'rejected'], default: 'approved', index: true },
      reviewNote: str({ default: '' }),
      submittedBy: str({ default: '' }), // user id of the agent who posted it
    },
    { prefix: 'p' },
  ),
)

/* --------------------------------------------------------------------- blog */
export const Post = model(
  'Post',
  makeSchema(
    {
      slug: str({ required: true, unique: true, lowercase: true }),
      title: str({ required: true }),
      description: str({ default: '' }),
      summary: str({ default: '' }),
      category: str({ default: 'General' }),
      author: str({ default: '' }),
      cover: str({ default: '' }),
      date: str({ default: '' }),
      updated: str({ default: '' }),
      intro: { type: String, default: '' },
      body: { type: String, default: '' },
      media: { type: Mixed, default: {} },
      faqs: { type: [{ _id: false, question: String, answer: String }], default: [] },
      related: { type: [String], default: [] },
      featured: { type: Boolean, default: false },
      active: { type: Boolean, default: false },
    },
    { prefix: 'b', minimize: false },
  ),
)

export const Faq = model(
  'Faq',
  makeSchema(
    {
      question: str({ required: true }),
      answer: { type: String, required: true },
      category: str({ default: '' }),
      pages: { type: [String], default: [] },
      active: { type: Boolean, default: true },
      order: { type: Number, default: 0, index: true },
    },
    { prefix: 'f' },
  ),
)

export const Testimonial = model(
  'Testimonial',
  makeSchema(
    {
      name: str({ required: true }),
      city: str({ default: '' }),
      avatar: str({ default: '' }),
      rating: { type: Number, default: 5, min: 0, max: 5 },
      text: { type: String, required: true },
      active: { type: Boolean, default: false },
      order: { type: Number, default: 0, index: true },
    },
    { prefix: 't' },
  ),
)

/* -------------------------------------------------------------------- leads */
export const Lead = model(
  'Lead',
  makeSchema(
    {
      propertyId: str({ default: null, index: true }),
      userId: str({ default: null, index: true }),
      userName: str({ required: true }),
      userEmail: str({ default: '' }),
      phone: str({ required: true, index: true }),
      budget: str({ default: '' }),
      city: str({ default: '' }),
      message: { type: String, default: '' },
      status: { type: String, enum: ['Pending', 'Responded'], default: 'Pending', index: true },
      date: str({ default: '' }),
      phoneVerified: { type: Boolean, default: false },
      source: str({ default: 'contact_page', index: true }), // contact_page | property_lead_form | signup | signup-prompt
      contactIntent: str({ default: '' }), // the contact form's interest choice (buy / rent / sell …)
      consent: { type: Boolean, default: false },
      consentId: str({ default: null }),
      intent: { type: String, enum: ['Hot', 'Warm', 'Cold'], default: 'Cold', index: true },
      interest: { type: Mixed, default: null },
      assignedAgentId: str({ default: '', index: true }),
      notes: { type: [{ _id: false, text: String, by: String, at: Date }], default: [] },
    },
    { prefix: 'i' },
  ),
)

/* ------------------------------------------- consent, otp, events, misc data */
export const Consent = model(
  'Consent',
  makeSchema(
    {
      phone: str({ index: true }),
      userId: str({ index: true }),
      leadId: str(),
      kind: str({ required: true }), // signup | agent-registration | enquiry
      textKey: str(), // e.g. siteContent.nudge.consentText
      text: { type: String, default: '' }, // the exact sentence the person accepted
      legalVersions: { type: Mixed, default: {} }, // { privacy: '2026-09-21', terms: '…' }
      source: str(),
      ip: str(),
      userAgent: str(),
      acceptedAt: { type: Date, default: () => new Date() },
      withdrawnAt: Date,
    },
    { prefix: 'c', timestamps: false, minimize: false },
  ),
)

const otpSchema = makeSchema(
  {
    phone: str({ required: true }),
    purpose: str({ required: true }),
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    consumed: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
    ip: str(),
  },
  { prefix: 'o' },
)
otpSchema.index({ phone: 1, purpose: 1, createdAt: -1 })
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 }) // auto-delete an hour after expiry
export const Otp = model('Otp', otpSchema)

const savedSchema = makeSchema({ userId: str({ required: true }), propertyId: str({ required: true }) }, { prefix: 's' })
savedSchema.index({ userId: 1, propertyId: 1 }, { unique: true })
export const Saved = model('Saved', savedSchema)

const eventSchema = makeSchema(
  {
    userId: str({ required: true, index: true }),
    type: { type: String, enum: ['view', 'search', 'save', 'compare', 'visit'], required: true },
    data: { type: Mixed, default: {} },
    at: { type: Date, default: () => new Date() },
  },
  { prefix: 'e', timestamps: false },
)
eventSchema.index({ at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 }) // retention: 12 months
export const Event = model('Event', eventSchema)

/** Key → value store: company, siteContent, ticker, topBanner, cities, propertyTypes, marketing, whatsapp, mail. */
export const Setting = model(
  'Setting',
  new mongoose.Schema(
    { _id: { type: String }, value: { type: Mixed, default: {} }, updatedBy: String },
    { timestamps: true, versionKey: false, minimize: false },
  ),
)

/** History of every legal-page text (privacy / terms / disclaimer) — proof of what was published when. */
export const LegalVersion = model(
  'LegalVersion',
  makeSchema({ kind: str({ required: true, index: true }), snapshot: { type: Mixed, required: true }, updatedDate: str(), changedBy: str() }, { prefix: 'lv', minimize: false }),
)

const auditSchema = makeSchema(
  { userId: str(), role: str(), action: str({ required: true }), entity: str(), entityId: str(), meta: { type: Mixed, default: {} }, at: { type: Date, default: () => new Date() } },
  { prefix: 'au', timestamps: false },
)
auditSchema.index({ at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 })
export const Audit = model('Audit', auditSchema)

export const Upload = model(
  'Upload',
  makeSchema({ file: str({ required: true }), url: str(), mime: str(), size: Number, by: str() }, { prefix: 'up' }),
)
