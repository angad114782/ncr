import Papa from 'papaparse'
import { isDataUrl, isImageLink } from './images'
import { slugify } from './blog'
import { newId } from './ids'

// CSV import / export / templates for the admin-managed collections.
// Rules shared by all of them:
//  • Images are LINKS ONLY (uploaded images live in the browser, not in a file) —
//    exports leave uploaded images blank and report how many were skipped.
//  • Rows whose id (or natural key) already exists UPDATE that item; the rest are added.
//  • Every row is validated; bad rows are skipped and listed, never silently guessed.

export const parseCsv = (text) =>
  Papa.parse(String(text).replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

export const buildCsv = (columns, rows) => Papa.unparse({ fields: columns, data: rows })

const clean = (v) => String(v ?? '').trim()
const toBool = (v, fallback = true) => {
  const s = clean(v).toLowerCase()
  if (!s) return fallback
  return ['true', 'yes', 'y', '1', 'active', 'published'].includes(s)
}
const linkOrBlank = (url) => (url && !isDataUrl(url) ? url : '')
const today = () => new Date().toISOString().slice(0, 10)

function rowErrors(parsed) {
  return parsed.errors.map((e) => `Row ${e.row + 2}: ${e.message}`)
}

/** Validates an optional image link; returns [value, error]. */
function checkImage(value, label) {
  const v = clean(value)
  if (!v) return ['', '']
  if (isDataUrl(v)) return ['', `${label} must be a web link (uploaded images can't be imported from CSV)`]
  if (!isImageLink(v)) return ['', `${label} must start with http(s):// or /`]
  return [v, '']
}

/* ------------------------------------------------------------------ Blog */

const BLOG_COLUMNS = ['slug', 'title', 'description', 'category', 'author', 'date', 'updated', 'cover', 'active', 'featured', 'intro', 'body', 'faqs', 'related']
const MEDIA_LINE = /^!\[[^\]]*\]\(media:[^)]*\)[ \t]*$/gm

const blogToRow = (p) => ({
  slug: p.slug,
  title: p.title,
  description: p.description ?? '',
  category: p.category ?? '',
  author: p.author ?? '',
  date: p.date ?? '',
  updated: p.updated ?? '',
  cover: linkOrBlank(p.cover),
  active: p.active !== false,
  featured: !!p.featured,
  intro: p.intro ?? '',
  body: (p.body ?? '').replace(MEDIA_LINE, '').replace(/\n{3,}/g, '\n\n').trim(),
  faqs: (p.faqs ?? []).map((f) => `${f.question}::${f.answer}`).join('||'),
  related: (p.related ?? []).join(';'),
})

export const blogCsv = {
  entity: 'blog posts',
  filename: 'blog-posts',
  keyHelp: 'Rows with an existing slug update that post; new slugs are added. faqs = Question::Answer||Question::Answer, related = slug;slug. Body uses the blog markup (## headings, - bullets, | tables |).',
  toCsv(items) {
    const skipped = items.reduce(
      (n, p) => n + (isDataUrl(p.cover) ? 1 : 0) + ((p.body ?? '').match(MEDIA_LINE)?.length ?? 0),
      0,
    )
    return { csv: buildCsv(BLOG_COLUMNS, items.map(blogToRow)), skipped }
  },
  template(seedItems) {
    const sample = seedItems[0] ? [blogToRow(seedItems[0])] : []
    sample.push({
      slug: 'my-new-guide', title: 'My New Guide', description: 'One-line summary shown in search results.', category: 'Buying Guides',
      author: 'Author Name', date: today(), updated: today(), cover: 'https://example.com/photo.jpg', active: true, featured: false,
      intro: 'Short intro paragraph.', body: '## First heading\n\nA paragraph of text.\n\n- Point one\n- Point two', faqs: 'A question?::The answer.', related: '',
    })
    return buildCsv(BLOG_COLUMNS, sample)
  },
  parse(text, existing) {
    const parsed = parseCsv(text)
    const errors = rowErrors(parsed)
    const bySlug = new Map(existing.map((p) => [p.slug, p]))
    const seen = new Set()
    const items = []
    parsed.data.forEach((row, i) => {
      const n = i + 2
      const title = clean(row.title)
      if (!title) return errors.push(`Row ${n}: title is required — skipped`)
      const slug = slugify(clean(row.slug) || title)
      if (!slug) return errors.push(`Row ${n}: could not make a URL slug — skipped`)
      if (seen.has(slug)) return errors.push(`Row ${n}: duplicate slug "${slug}" in this file — skipped`)
      const [cover, coverErr] = checkImage(row.cover, 'cover')
      if (coverErr) return errors.push(`Row ${n}: ${coverErr} — skipped`)
      seen.add(slug)
      const prev = bySlug.get(slug)
      const date = clean(row.date) || prev?.date || today()
      items.push({
        ...(prev ?? { media: {} }),
        id: prev?.id ?? newId('b'),
        slug,
        title,
        description: clean(row.description),
        category: clean(row.category) || 'General',
        author: clean(row.author) || prev?.author || '',
        date,
        updated: clean(row.updated) || date,
        cover: cover || (prev && isDataUrl(prev.cover) ? prev.cover : ''),
        active: toBool(row.active, true),
        featured: toBool(row.featured, false),
        intro: clean(row.intro),
        body: String(row.body ?? '').replace(/\r\n?/g, '\n').trim(),
        faqs: clean(row.faqs)
          ? clean(row.faqs).split('||').map((pair) => {
              const [q, ...a] = pair.split('::')
              return { question: clean(q), answer: clean(a.join('::')) }
            }).filter((f) => f.question && f.answer)
          : [],
        related: clean(row.related) ? clean(row.related).split(';').map(clean).filter(Boolean) : [],
      })
    })
    return { items, errors }
  },
}

/* ------------------------------------------------------------------- FAQ */

export const FAQ_PAGES = ['home', 'about', 'contact']
const FAQ_COLUMNS = ['id', 'question', 'answer', 'category', 'pages', 'active']

const faqToRow = (f) => ({
  id: f.id, question: f.question, answer: f.answer, category: f.category ?? '', pages: (f.pages ?? []).join(';'), active: f.active !== false,
})

export const faqCsv = {
  entity: 'FAQs',
  filename: 'faqs',
  keyHelp: 'Rows whose id (or exact question) already exists update that FAQ; the rest are added. pages = home;about;contact (semicolon separated).',
  toCsv: (items) => ({ csv: buildCsv(FAQ_COLUMNS, items.map(faqToRow)), skipped: 0 }),
  template(seedItems) {
    const rows = seedItems.slice(0, 2).map((f) => ({ ...faqToRow(f), id: '' }))
    rows.push({ id: '', question: 'Your new question?', answer: 'Your answer.', category: 'General', pages: 'home;contact', active: true })
    return buildCsv(FAQ_COLUMNS, rows)
  },
  parse(text, existing) {
    const parsed = parseCsv(text)
    const errors = rowErrors(parsed)
    const byId = new Map(existing.map((f) => [f.id, f]))
    const byQuestion = new Map(existing.map((f) => [f.question.trim().toLowerCase(), f]))
    const seen = new Set()
    const items = []
    parsed.data.forEach((row, i) => {
      const n = i + 2
      const question = clean(row.question)
      const answer = clean(row.answer)
      if (!question || !answer) return errors.push(`Row ${n}: question and answer are both required — skipped`)
      const prev = byId.get(clean(row.id)) ?? byQuestion.get(question.toLowerCase())
      const id = prev?.id ?? newId('f')
      if (seen.has(id)) return errors.push(`Row ${n}: duplicate FAQ in this file — skipped`)
      seen.add(id)
      const pages = clean(row.pages).split(';').map((p) => clean(p).toLowerCase()).filter((p) => FAQ_PAGES.includes(p))
      items.push({ ...(prev ?? {}), id, question, answer, category: clean(row.category) || 'General', pages: pages.length ? pages : ['home'], active: toBool(row.active, true) })
    })
    return { items, errors }
  },
}

/* --------------------------------------------------------- Testimonials */

const TESTIMONIAL_COLUMNS = ['id', 'name', 'city', 'rating', 'text', 'avatar', 'active']
const testimonialToRow = (t) => ({ id: t.id, name: t.name, city: t.city ?? '', rating: t.rating ?? 5, text: t.text, avatar: linkOrBlank(t.avatar), active: t.active !== false })

export const testimonialCsv = {
  entity: 'testimonials',
  filename: 'testimonials',
  keyHelp: 'Only import real, consented client reviews. Rows with an existing id update it; the rest are added. rating is 1–5.',
  toCsv: (items) => ({ csv: buildCsv(TESTIMONIAL_COLUMNS, items.map(testimonialToRow)), skipped: items.filter((t) => isDataUrl(t.avatar)).length }),
  template: () => buildCsv(TESTIMONIAL_COLUMNS, [{ id: '', name: 'Client Name', city: 'Mumbai', rating: 5, text: 'What the client said about working with you.', avatar: 'https://example.com/photo.jpg', active: true }]),
  parse(text, existing) {
    const parsed = parseCsv(text)
    const errors = rowErrors(parsed)
    const byId = new Map(existing.map((t) => [t.id, t]))
    const items = []
    parsed.data.forEach((row, i) => {
      const n = i + 2
      if (!clean(row.name) || !clean(row.text)) return errors.push(`Row ${n}: name and text are required — skipped`)
      const [avatar, avatarErr] = checkImage(row.avatar, 'avatar')
      if (avatarErr) return errors.push(`Row ${n}: ${avatarErr} — skipped`)
      const rating = Math.min(5, Math.max(1, Number(row.rating) || 5))
      const prev = byId.get(clean(row.id))
      items.push({ ...(prev ?? {}), id: prev?.id ?? newId('t'), name: clean(row.name), city: clean(row.city), rating, text: clean(row.text), avatar, active: toBool(row.active, true) })
    })
    return { items, errors }
  },
}

/* ---------------------------------------------------------------- Agents */

const AGENT_COLUMNS = ['id', 'name', 'role', 'city', 'phone', 'email', 'avatar', 'rating', 'dealsClosed', 'status', 'active', 'bio']
const agentToRow = (a) => ({ id: a.id, name: a.name, role: a.role ?? '', city: a.city ?? '', phone: a.phone ?? '', email: a.email ?? '', avatar: linkOrBlank(a.avatar), rating: a.rating ?? '', dealsClosed: a.dealsClosed ?? '', status: a.status ?? 'approved', active: a.active !== false, bio: a.bio ?? '' })

export const agentCsv = {
  entity: 'agents',
  filename: 'agents',
  keyHelp: 'Rows whose id (or email) already exists update that agent; the rest are added. status = approved | pending | rejected.',
  toCsv: (items) => ({ csv: buildCsv(AGENT_COLUMNS, items.map(agentToRow)), skipped: items.filter((a) => isDataUrl(a.avatar)).length }),
  template: (seedItems) => buildCsv(AGENT_COLUMNS, [...seedItems.slice(0, 1).map((a) => ({ ...agentToRow(a), id: '' }))]),
  parse(text, existing) {
    const parsed = parseCsv(text)
    const errors = rowErrors(parsed)
    const byId = new Map(existing.map((a) => [a.id, a]))
    const byEmail = new Map(existing.filter((a) => a.email).map((a) => [a.email.toLowerCase(), a]))
    const items = []
    parsed.data.forEach((row, i) => {
      const n = i + 2
      if (!clean(row.name)) return errors.push(`Row ${n}: name is required — skipped`)
      const [avatar, avatarErr] = checkImage(row.avatar, 'avatar')
      if (avatarErr) return errors.push(`Row ${n}: ${avatarErr} — skipped`)
      const status = ['approved', 'pending', 'rejected'].includes(clean(row.status).toLowerCase()) ? clean(row.status).toLowerCase() : 'approved'
      const prev = byId.get(clean(row.id)) ?? byEmail.get(clean(row.email).toLowerCase())
      items.push({
        ...(prev ?? {}),
        id: prev?.id ?? newId('a'),
        name: clean(row.name), role: clean(row.role), city: clean(row.city), phone: clean(row.phone), email: clean(row.email),
        avatar: avatar || (prev && isDataUrl(prev.avatar) ? prev.avatar : ''),
        rating: Math.min(5, Math.max(0, Number(row.rating) || 0)), dealsClosed: Math.max(0, Number(row.dealsClosed) || 0),
        status, active: toBool(row.active, true), bio: clean(row.bio),
      })
    })
    return { items, errors }
  },
}
