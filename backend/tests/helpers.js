import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'

/**
 * Starts a throw-away in-memory MongoDB and the real app on top of it, seeded with the website's sample
 * data. Tests NEVER touch the Atlas database: MONGODB_URI is forced to the local temporary server first.
 */
export async function startTestApp({ seed = true } = {}) {
  const mongod = await MongoMemoryServer.create()
  const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'ncr-uploads-'))
  process.env.NODE_ENV = 'test'
  process.env.MONGODB_URI = mongod.getUri('ncr_test')
  process.env.JWT_SECRET = `test-secret-${'x'.repeat(40)}`
  process.env.OTP_DEV_MODE = 'true'
  process.env.UPLOAD_DIR = uploads
  process.env.CLIENT_ORIGINS = 'http://localhost:5173'
  if (!/127\.0\.0\.1|localhost/.test(process.env.MONGODB_URI)) throw new Error('refusing to run tests against a remote database')

  const { connectDb, disconnectDb } = await import('../src/db.js')
  const { createApp } = await import('../src/app.js')
  const { seedDatabase, ensureAdmin } = await import('../src/seed/seed.js')
  try {
    await connectDb(process.env.MONGODB_URI) // explicit: several test suites can run one after another in the same process
  } catch (err) {
    await mongod.stop()
    throw err
  }
  if (seed) {
    await seedDatabase({ reset: true })
    await ensureAdmin()
  }
  const app = createApp()

  /** A browser-like client (keeps the session cookie) signed in with a real OTP flow. */
  async function login(phone) {
    const { Otp } = await import('../src/models/index.js')
    await Otp.deleteMany({ phone }) // the 30-second resend cooldown would otherwise slow every test
    const client = request.agent(app)
    const sent = await client.post('/api/auth/otp/send').send({ phone, purpose: 'login' })
    if (sent.status !== 200) throw new Error(`otp/send ${sent.status}: ${JSON.stringify(sent.body)}`)
    const res = await client.post('/api/auth/login').send({ phone, otp: sent.body.devOtp })
    if (res.status !== 200) throw new Error(`login ${res.status}: ${JSON.stringify(res.body)}`)
    return client
  }

  /** Registers a new account (client by default) and returns the signed-in client. */
  async function register(fields) {
    const { Otp } = await import('../src/models/index.js')
    await Otp.deleteMany({ phone: fields.phone })
    const client = request.agent(app)
    const sent = await client.post('/api/auth/otp/send').send({ phone: fields.phone, purpose: 'register' })
    if (sent.status !== 200) throw new Error(`otp/send ${sent.status}: ${JSON.stringify(sent.body)}`)
    const res = await client.post('/api/auth/register').send({ consent: { accepted: true }, ...fields, otp: sent.body.devOtp })
    if (res.status !== 201) throw new Error(`register ${res.status}: ${JSON.stringify(res.body)}`)
    client.registered = res.body
    return client
  }

  const stop = async () => {
    await disconnectDb()
    await mongod.stop()
    fs.rmSync(uploads, { recursive: true, force: true })
  }

  return { app, request: request(app), login, register, stop, uploads }
}

export const ADMIN_PHONE = '8619930583'
// a valid 1x1 PNG
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
