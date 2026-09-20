import { bodyPlainText } from './blogBody'

// Pure helpers only — posts themselves live in DataContext (admin-managed).

export const slugify = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export function postText(post) {
  const parts = [post.intro ?? '', bodyPlainText(post.body ?? '')]
  post.faqs?.forEach((f) => parts.push(f.question, f.answer))
  return parts.join(' ')
}

// ~200 words per minute is the usual reading-time estimate.
export function readingMinutes(post) {
  const words = postText(post).split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Cover image usable in meta tags / JSON-LD — uploaded (data:) images are not crawlable. */
export const shareableImage = (src) => (src && !src.startsWith('data:') ? src : undefined)
