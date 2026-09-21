import { config, assertConfig } from './config.js'
import { connectDb, disconnectDb } from './db.js'
import { createApp } from './app.js'
import { ensureAdmin } from './seed/seed.js'

function fail(err) {
  if (err?.code === 'EADDRINUSE') {
    console.error(`\nPort ${config.port} is already in use by another program, so the API cannot start.`)
    console.error(`→ Pick a free port: set PORT=… in backend/.env (find one with:  ss -ltnp | grep :${config.port}  to see who has it), then restart.`)
    console.error('→ nginx must proxy /api and /uploads to the same port (deploy/render-nginx-snippet.sh does that from PORT).')
  } else {
    console.error(`\nCould not start the server: ${err?.message ?? err}`)
  }
  process.exit(1)
}

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

  // Express 5 hands a listen error (port already in use…) to this callback instead of throwing — so it must be
  // checked here, or the process stays alive, prints "listening" and serves nothing.
  const server = createApp().listen(config.port, config.host, (err) => {
    if (err) return fail(err)
    console.log(`NCR API listening on http://${config.host}:${config.port}  (${config.env})`)
  })
  server.on('error', fail)

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
