// Text capitalisation and BHK-configuration rules for listings — the same rules as src/utils/listingText.js (keep the two in step).

const SMALL = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with'])

/** "sea-facing 3bhk flat in dlf phase 2" → "Sea-Facing 3BHK Flat in DLF Phase 2". Words that already carry capitals (DLF, RERA) are kept. */
export function titleCase(text) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!s) return ''
  let first = true
  return s.replace(/[^\s]+/g, (word) => {
    const isFirst = first
    first = false
    if (/^\d+\s*bhk\+?$/i.test(word)) return word.toUpperCase()
    if (/[A-Z]/.test(word.slice(1)) || /^[A-Z]{2,}$/.test(word)) return word // DLF, McDonald's, 2BHK
    if (!isFirst && SMALL.has(word.toLowerCase())) return word.toLowerCase()
    return word.replace(/(^|[-/(])([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase())
  })
}

/** Capital letter at the start of every sentence / line; the rest is left exactly as written. */
export function sentenceCase(text) {
  const s = String(text ?? '').trim()
  return s.replace(/(^|[.!?]\s+|\n\s*)([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase())
}

/** The saved listing's BHK configurations: only rows with a BHK count, sorted small → large. */
export function cleanConfigurations(list) {
  return (Array.isArray(list) ? list : [])
    .map((c) => ({ beds: Number(c?.beds) || 0, areaSqft: Number(c?.areaSqft) || 0, price: Number(c?.price) || 0 }))
    .filter((c) => c.beds > 0)
    .sort((a, b) => a.beds - b.beds || a.price - b.price)
}

/** Every BHK a listing is sold in: its configurations, or just its own `beds` when it has none. */
export const bhkOptions = (p) => {
  const fromConfigs = (p.configurations ?? []).map((c) => Number(c.beds)).filter((n) => n > 0)
  return fromConfigs.length ? fromConfigs : p.beds > 0 ? [Number(p.beds)] : []
}

/** Does the listing come in this BHK (4 means "4 or more")? */
export const hasBhk = (p, n) => bhkOptions(p).some((b) => (n >= 4 ? b >= 4 : b === n))

/** "2, 3 & 4 BHK" */
export function bhkSummary(p) {
  const list = [...new Set(bhkOptions(p))].sort((a, b) => a - b)
  if (!list.length) return ''
  return `${list.length > 1 ? `${list.slice(0, -1).join(', ')} & ${list.at(-1)}` : list[0]} BHK`
}

/** Question / answer pairs with both sides filled in. */
export const cleanFaqs = (list) =>
  (Array.isArray(list) ? list : [])
    .map((f) => ({ question: sentenceCase(f?.question), answer: sentenceCase(f?.answer) }))
    .filter((f) => f.question && f.answer)

/** Capitalises every short text a listing shows (title, place names, amenities, …). */
export function capitaliseListing(p) {
  return {
    ...p,
    title: titleCase(p.title),
    locality: titleCase(p.locality),
    address: titleCase(p.address),
    description: sentenceCase(p.description),
    amenities: (p.amenities ?? []).map(titleCase).filter(Boolean),
    nearby: (p.nearby ?? []).map((n) => ({ ...n, name: titleCase(n.name), distance: String(n.distance ?? '').trim() })).filter((n) => n.name),
  }
}

/** A stored listing as visitors see it: all its text capitalised, FAQs and BHK sizes tidied (listings saved before the rule included). */
export const displayListing = (p) => ({ ...capitaliseListing(p), configurations: cleanConfigurations(p.configurations), faqs: cleanFaqs(p.faqs) })
