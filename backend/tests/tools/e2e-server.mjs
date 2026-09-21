// Starts everything needed to try the website against the real backend WITHOUT touching your database:
//   • a throw-away in-memory MongoDB, filled with the sample data,
//   • the API on :5055,
//   • the built website (../dist) on :4174 with /api and /uploads proxied to the API — exactly what nginx does.
//
//   cd backend && node tests/tools/e2e-server.mjs        (build the website first: npm run build in the project root)
//
// Used by the browser tests; also handy to click around by hand. Stop with Ctrl+C.
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MongoMemoryServer } from 'mongodb-memory-server'

const here = path.dirname(fileURLToPath(import.meta.url))
const dist = path.resolve(here, '../../../dist')
const API_PORT = Number(process.env.E2E_API_PORT ?? 5055)
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 4174)

const mongod = await MongoMemoryServer.create()
process.env.NODE_ENV = 'test' // no rate limits / request logging
process.env.MONGODB_URI = mongod.getUri('ncr_e2e')
process.env.JWT_SECRET = `e2e-secret-${'y'.repeat(40)}`
process.env.OTP_DEV_MODE = 'true'
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ncr-e2e-uploads-'))
process.env.CLIENT_ORIGINS = `http://localhost:${WEB_PORT}`

const { connectDb } = await import('../../src/db.js')
const { createApp } = await import('../../src/app.js')
const { seedDatabase, ensureAdmin } = await import('../../src/seed/seed.js')
await connectDb(process.env.MONGODB_URI)
await seedDatabase({ reset: true })
await ensureAdmin()
createApp().listen(API_PORT, () => console.log(`API      http://localhost:${API_PORT}/api/health`))

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.map': 'application/json' }

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/uploads')) {
      const upstream = http.request({ host: '127.0.0.1', port: API_PORT, path: req.url, method: req.method, headers: { ...req.headers, host: `localhost:${WEB_PORT}` } }, (r) => {
        res.writeHead(r.statusCode, r.headers)
        r.pipe(res)
      })
      upstream.on('error', () => res.writeHead(502).end('bad gateway'))
      req.pipe(upstream)
      return
    }
    // nginx: try_files $uri $uri/ /index.html
    for (const t of [url.pathname, path.join(url.pathname, 'index.html'), '/index.html']) {
      const f = path.normalize(path.join(dist, decodeURIComponent(t)))
      if (f.startsWith(dist) && fs.existsSync(f) && fs.statSync(f).isFile()) {
        res.writeHead(200, { 'content-type': types[path.extname(f)] ?? 'application/octet-stream' })
        return res.end(fs.readFileSync(f))
      }
    }
    res.writeHead(404).end('not found')
  })
  .listen(WEB_PORT, () => console.log(`Website  http://localhost:${WEB_PORT}   (admin login: 8619930583, the OTP is shown on screen)`))

const stop = async () => {
  await mongod.stop()
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
