import { config, assertConfig } from './config.js'
import { connectDb, disconnectDb } from './db.js'
import { createApp } from './app.js'
import { ensureAdmin } from './seed/seed.js'

async function main() {
  assertConfig()
  try {
    await connectDb()
  } catch (err) {
    console.error(`\nCould not connect to MongoDB: ${err.message}`)
    if (/bad auth|authentication failed/i.test(err.message)) console.error('→ The username or password in MONGODB_URI is wrong (Atlas → Database Access → edit the user / reset its password).')
    if (/ENOTFOUND|ECONNREFUSED|timed out|Server selection/i.test(err.message)) console.error('→ Atlas → Network Access → add your server IP (or 0.0.0.0/0 while testing).')
    process.exit(1)
  }
  console.log(`MongoDB connected (${(await import('mongoose')).default.connection.name})`)

  const admin = await ensureAdmin()
  if (admin.created) console.log(`Created the first admin account for ${admin.user.phone}. Log in with an OTP sent to that number.`)

  const server = createApp().listen(config.port, () => console.log(`NCR API listening on http://localhost:${config.port}  (${config.env})`))

  const shutdown = async (signal) => {
    console.log(`\n${signal} — shutting down`)
    server.close(async () => {
      await disconnectDb()
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10_000).unref()
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err))
main()
