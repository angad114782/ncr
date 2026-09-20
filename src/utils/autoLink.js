// Dynamic internal linking. Turns the first mention of a keyword in a piece of text into a link, so
// guides, FAQs and listings pass authority to each other without anyone hand-linking every article.
//
// Rules come from Admin → Site Content → SEO & links (keyword → page) plus every city name →
// /buy/{city}. Text that is already a link is never touched, each rule links once per article, and a
// page never links to itself.
import { listingsPath } from './listingsUrl.js'

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** [{ keyword, to }] — admin rules first (they win), then the cities. */
export function buildAutoLinkRules({ seo, cities = [] }) {
  const rules = (seo?.autoLinks ?? [])
    .filter((r) => r?.keyword?.trim() && r?.to?.trim())
    .map((r) => ({ keyword: r.keyword.trim(), to: r.to.trim() }))
  if (seo?.autoLinkCities !== false) {
    cities.forEach((city) => rules.push({ keyword: city, to: listingsPath({ purpose: 'Buy', city }) }))
  }
  // Longest keyword first so "home loan eligibility" beats "home loan".
  return rules.sort((a, b) => b.keyword.length - a.keyword.length)
}

/**
 * Splits `text` into [{ text } | { text, to }] parts.
 *
 * `claims` (a Map shared by all the text of one page) records which piece of text linked each
 * keyword, so a keyword links once per page — the first place it appears wins. Rendering must stay
 * pure (React may render a component twice), so a piece of text identified by `id` that already owns
 * a keyword keeps linking it on a re-render instead of losing it. `currentPath` is never a target.
 */
export function autoLinkParts(text, rules, { claims = new Map(), id = '', currentPath = '' } = {}) {
  if (!text || !rules.length) return [{ text }]
  const active = rules.filter((r) => {
    const owner = claims.get(r.keyword.toLowerCase())
    return (owner === undefined || owner === id) && r.to !== currentPath
  })
  if (!active.length) return [{ text }]

  const re = new RegExp(`(?<![\\w-])(${active.map((r) => escapeRe(r.keyword)).join('|')})(?![\\w-])`, 'gi')
  const parts = []
  const linkedHere = new Set()
  let last = 0
  for (const m of text.matchAll(re)) {
    const key = m[1].toLowerCase()
    if (linkedHere.has(key)) continue
    const rule = active.find((r) => r.keyword.toLowerCase() === key)
    if (!rule) continue
    linkedHere.add(key)
    claims.set(key, id)
    if (m.index > last) parts.push({ text: text.slice(last, m.index) })
    parts.push({ text: m[1], to: rule.to })
    last = m.index + m[1].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts.length ? parts : [{ text }]
}
