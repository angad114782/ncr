import { Router } from 'express'
import publicRoutes from './public.js'
import authRoutes from './auth.js'
import meRoutes from './me.js'
import agentRoutes from './agent.js'
import uploadRoutes from './uploads.js'
import eventsRoutes from './events.js'
import adminProperties from './admin-properties.js'
import adminSystem from './admin-system.js'
import { agents, blog, faqs, leads, testimonials, users } from './admin-content.js'
import { requireRole } from '../middleware/index.js'

const api = Router()

api.use('/auth', authRoutes)
api.use('/me', meRoutes)
api.use('/uploads', uploadRoutes)
api.use('/agent', agentRoutes)
api.use('/events', eventsRoutes)

const admin = Router()
admin.use(requireRole('admin'))
admin.use('/properties', adminProperties)
admin.use('/agents', agents)
admin.use('/users', users)
admin.use('/blog', blog)
admin.use('/faqs', faqs)
admin.use('/testimonials', testimonials)
admin.use('/leads', leads)
admin.use('/', adminSystem)
api.use('/admin', admin)

api.use('/', publicRoutes)

export default api
