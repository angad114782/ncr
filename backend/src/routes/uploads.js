import { Router } from 'express'
import multer from 'multer'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { config } from '../config.js'
import { Upload } from '../models/index.js'
import { badRequest, forbidden, notFound } from '../lib/errors.js'
import { audit } from '../lib/misc.js'
import { out } from '../lib/serialize.js'
import { requireRole, uploadLimiter } from '../middleware/index.js'

/**
 * Image uploads for listings, avatars, blog covers. Files go to the upload folder (UPLOAD_DIR) and are
 * served from /uploads; the API returns the link, which is what the website stores (never data: URLs).
 * Only real images are accepted: the file's own bytes are checked, not just its name.
 */
const router = Router()

const TYPES = {
  'image/jpeg': { ext: 'jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: 'png', magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { ext: 'webp', magic: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
  'image/gif': { ext: 'gif', magic: (b) => b.subarray(0, 3).toString() === 'GIF' },
  'image/avif': { ext: 'avif', magic: (b) => b.subarray(4, 12).toString().startsWith('ftypavif') },
}

const upload = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, cb) => {
      await fs.mkdir(config.uploadDir, { recursive: true })
      cb(null, config.uploadDir)
    },
    filename: (_req, file, cb) => cb(null, `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}.${TYPES[file.mimetype]?.ext ?? 'bin'}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => (TYPES[file.mimetype] ? cb(null, true) : cb(badRequest('Only JPG, PNG, WebP, GIF or AVIF images are allowed.'))),
})

// Site-relative (/uploads/x.jpg) unless PUBLIC_API_URL is set: the website and nginx serve it from the same origin.
const urlFor = (_req, file) => `${config.publicApiUrl}/uploads/${file}`

router.post('/', requireRole('agent', 'admin'), uploadLimiter, upload.array('files', 10), async (req, res) => {
  const files = req.files ?? []
  if (!files.length) throw badRequest('Choose at least one image (form field "files").')
  const saved = []
  for (const f of files) {
    const head = Buffer.alloc(16)
    const fh = await fs.open(f.path, 'r')
    await fh.read(head, 0, 16, 0)
    await fh.close()
    if (!TYPES[f.mimetype].magic(head)) {
      await fs.unlink(f.path).catch(() => {})
      throw badRequest(`“${f.originalname}” is not a valid ${f.mimetype.split('/')[1].toUpperCase()} image.`)
    }
    saved.push(await Upload.create({ file: f.filename, url: urlFor(req, f.filename), mime: f.mimetype, size: f.size, by: req.user.id }))
  }
  audit(req, 'upload', 'upload', '', { count: saved.length })
  res.status(201).json({ items: out(saved).map((u) => ({ url: u.url, file: u.file, size: u.size })) })
})

router.delete('/:file', requireRole('agent', 'admin'), async (req, res) => {
  const file = path.basename(req.params.file)
  const doc = await Upload.findOne({ file })
  if (!doc) throw notFound('File not found.')
  if (req.user.role !== 'admin' && doc.by !== req.user.id) throw forbidden('You can only delete your own uploads.')
  await fs.unlink(path.join(config.uploadDir, file)).catch(() => {})
  await doc.deleteOne()
  res.json({ ok: true })
})

export default router
