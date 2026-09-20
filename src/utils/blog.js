import posts from '../data/blog.json'

export const allPosts = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date))

export const getPost = (slug) => allPosts.find((p) => p.slug === slug)

export const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

function postText(post) {
  const parts = [post.intro]
  post.sections.forEach((s) => {
    parts.push(s.heading, ...(s.body ?? []), ...(s.list ?? []))
    if (s.table) parts.push(...s.table.head, ...s.table.rows.flat())
  })
  post.faqs?.forEach((f) => parts.push(f.question, f.answer))
  return parts.join(' ')
}

// ~200 words per minute is the usual reading-time estimate.
export function readingMinutes(post) {
  const words = postText(post).split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
