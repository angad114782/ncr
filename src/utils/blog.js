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

const STOP = new Set('the a an and or of to in for on with your you how what is are be by at from as it this that into india indian guide explained'.split(' '))
const keywords = (post) => new Set(`${post.title} ${post.category ?? ''}`.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)))

/**
 * Guides to link from a post: the admin's hand-picked ones first, then the same category, then the
 * closest by shared title keywords, then the newest — so a new article is never a dead end.
 */
export function relatedPosts(post, all, max = 3) {
  const others = all.filter((p) => p.slug !== post.slug)
  const picked = (post.related ?? []).map((s) => others.find((p) => p.slug === s)).filter(Boolean)
  if (picked.length >= max) return picked.slice(0, max)

  const mine = keywords(post)
  const score = (p) => {
    let n = p.category === post.category ? 10 : 0
    keywords(p).forEach((w) => { if (mine.has(w)) n += 1 })
    return n
  }
  const rest = others
    .filter((p) => !picked.includes(p))
    .sort((a, b) => score(b) - score(a) || new Date(b.date || 0) - new Date(a.date || 0))
  return [...picked, ...rest].slice(0, max)
}
