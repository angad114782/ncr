import express from 'express'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import mongoose from 'mongoose'
import { config } from './config.js'
import routes from './routes/index.js'
import { authenticate, errorHandler, globalLimiter, notFoundHandler, originGuard, sanitizeBody } from './middleware/index.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  // behind nginx / a load balancer the real client IP is in X-Forwarded-For (needed for rate limits + consent records)
  app.set('trust proxy', process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : config.isProd ? 1 : false)

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })) // images in /uploads are used on the website's origin
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || config.isTest || config.clientOrigins.includes(origin)),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      maxAge: 600,
    }),
  )
  app.use(compression())

  if (!config.isTest) {
    app.use((req, res, next) => {
      const start = Date.now()
      res.on('finish', () => console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`)) // no query string, no body — they can hold personal data
      next()
    })
  }

  app.use(express.json({ limit: '2mb' }))
  app.use(cookieParser())
  app.use(sanitizeBody)
  app.use(originGuard)
  app.use(globalLimiter)

  app.use('/uploads', express.static(config.uploadDir, { maxAge: '30d', immutable: true, index: false, setHeaders: (res) => res.set('X-Content-Type-Options', 'nosniff') }))

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'ncr-api', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', uptime: Math.round(process.uptime()) }))
  app.use('/api', authenticate, routes)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
