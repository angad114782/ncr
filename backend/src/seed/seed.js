import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { config } from '../config.js'
import { connectDb, disconnectDb } from '../db.js'
import { Agent, Faq, Lead, Post, Property, Testimonial, User } from '../models/index.js'
import { ensureSlugs } from '../lib/propertySlug.js'
import { newId } from '../lib/ids.js'

/**
 * Loads the website's sample content (src/data/*.json next to this folder) into MongoDB:
 * users, agents, properties, blog posts, FAQs, testimonials, sample enquiries.
 *
 *   npm run seed          adds whatever is missing (never overwrites anything already in the database)
 *   npm run seed:reset    empties those collections first, then loads the samples
 *
 * Site settings are NOT copied: they fall back to the website's built-in defaults until the admin saves them.
 */
const dataDir = path.resolve(config.root, '..', 'src', 'data')

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(path.join(dataDir, file), 'utf8'))
  } catch {
    return null
  }
}

/** Inserts documents whose id is not in the collection yet. */
async function insertMissing(Model, docs) {
  if (!docs.length) return 0
  const ops = docs.map(({ _id, ...doc }) => ({ updateOne: { filter: { _id }, update: { $setOnInsert: doc }, upsert: true } }))
  const res = await Model.bulkWrite(ops, { ordered: false })
  return res.upsertedCount
}

const withId = ({ id, ...rest }) => ({ _id: id, ...rest })

export async function seedDatabase({ reset = false, log = () => {} } = {}) {
  const report = {}
  if (reset) await Promise.all([User, Agent, Property, Post, Faq, Testimonial, Lead].map((M) => M.deleteMany({})))

  const users = await readJson('users.json')
  if (users) report.users = await insertMissing(User, users.map((u) => withId({ ...u, active: true })))

  const agents = await readJson('agents.json')
  if (agents) report.agents = await insertMissing(Agent, agents.map((a) => withId({ ...a, active: a.active !== false, status: a.status ?? 'approved', joined: '' })))

  const properties = await readJson('properties.json')
  if (properties) {
    report.properties = await insertMissing(Property, ensureSlugs(properties).map((p) => withId({ ...p, active: p.active !== false })))
  }

  const posts = await readJson('blog.json')
  if (posts) report.posts = await insertMissing(Post, posts.map((p) => withId({ ...p, active: p.active !== false })))

  const faqs = await readJson('faqs.json')
  if (faqs) report.faqs = await insertMissing(Faq, faqs.map((f, i) => withId({ ...f, order: i, active: f.active !== false })))

  const testimonials = await readJson('testimonials.json')
  if (testimonials) report.testimonials = await insertMissing(Testimonial, testimonials.map((t, i) => withId({ ...t, order: i, active: t.active === true })))

  const inquiries = await readJson('inquiries.json')
  if (inquiries) {
    report.leads = await insertMissing(
      Lead,
      inquiries.map((i) => withId({ ...i, phone: String(i.phone ?? '').replace(/\D/g, '').slice(-10), source: 'contact_page', intent: 'Cold', consent: false })),
    )
  }

  Object.entries(report).forEach(([k, n]) => log(`  ${k}: ${n} added`))
  if (!Object.keys(report).length) log(`  (no sample data found in ${dataDir})`)
  return report
}

/** Makes sure there is at least one admin so the panel can be opened (log in with an OTP to ADMIN_PHONE). */
export async function ensureAdmin() {
  const existing = await User.findOne({ role: 'admin' })
  if (existing) return { created: false, user: existing }
  const user = await User.findOneAndUpdate(
    { phone: config.adminPhone },
    { $set: { role: 'admin', active: true }, $setOnInsert: { _id: newId('u'), name: config.adminName, city: '' } },
    { upsert: true, returnDocument: 'after' },
  )
  return { created: true, user }
}

// `node src/seed/seed.js [--reset]`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const reset = process.argv.includes('--reset')
  try {
    await connectDb()
    console.log(`${reset ? 'Resetting and seeding' : 'Seeding'} database “${(await import('mongoose')).default.connection.name}”…`)
    await seedDatabase({ reset, log: console.log })
    const admin = await ensureAdmin()
    console.log(admin.created ? `Admin account created for ${admin.user.phone}.` : 'Admin account already exists.')
    console.log('Done.')
  } catch (err) {
    console.error('Seed failed:', err.message)
    process.exitCode = 1
  } finally {
    await disconnectDb()
  }
}
