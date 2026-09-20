// Readable property URLs: /property/sea-facing-3bhk-apartment instead of /property/p6.
//
// A slug is made from the listing title. If another listing already has it, the city / locality /
// property type / purpose / BHK is added ("modern-2bhk-flat-pune", "…-koregaon-park-pune"), and only
// as a last resort a number. Dependency-free so the build scripts (sitemap, pre-render) and the app
// produce exactly the same URLs.
import { slugify } from './listingsUrl.js'

const MAX_LENGTH = 80

/** Canonical path of a listing. Falls back to the id for a listing that has no slug yet. */
export const propertyPath = (p) => `/property/${p.slug || p.id}`

const clip = (s) => s.slice(0, MAX_LENGTH).replace(/-+$/, '')
const has = (slug, part) => `-${slug}-`.includes(`-${part}-`)

/**
 * The best unused slug for `property`. `slugs` = every slug (and old slug) already taken by OTHER
 * listings; `ids` = the ids of other listings (a slug must never equal another listing's id, or the
 * old /property/p6 link would be ambiguous). Both are lower-case Sets.
 */
export function uniqueSlug(property, slugs, ids = new Set()) {
  const bhk = property.beds ? `${property.beds}-bhk` : ''
  const purpose = property.purpose === 'Rent' ? 'for-rent' : property.purpose === 'Buy' ? 'for-sale' : ''
  const base = clip(slugify(property.title || '') || slugify(`${bhk} ${property.type || 'property'} ${purpose}`) || 'property')

  const parts = {
    city: slugify(property.city || ''),
    locality: slugify(property.locality || ''),
    type: slugify(property.type || ''),
    purpose,
    bhk,
  }
  // base + the given details, skipping any that the title already says
  const withDetails = (...keys) => {
    let s = base
    keys.forEach((k) => {
      if (parts[k] && !has(s, parts[k])) s += `-${parts[k]}`
    })
    return clip(s)
  }

  const candidates = [
    base,
    withDetails('city'),
    withDetails('locality'),
    withDetails('locality', 'city'),
    withDetails('type', 'city'),
    withDetails('purpose', 'city'),
    withDetails('bhk', 'city'),
    withDetails('type', 'locality', 'city'),
    withDetails('purpose', 'locality', 'city'),
    withDetails('bhk', 'type', 'locality', 'city'),
  ]
  const free = (s) => s && !slugs.has(s) && !ids.has(s)
  const hit = candidates.find(free)
  if (hit) return hit

  let n = 2
  while (!free(`${base}-${n}`)) n++
  return `${base}-${n}`
}

const lower = (v) => String(v).toLowerCase()

/** Slugs + ids taken by every listing except `self`. */
function takenBy(list, selfId) {
  const slugs = new Set()
  const ids = new Set()
  list.forEach((p) => {
    if (p.id === selfId) return
    ids.add(lower(p.id))
    if (p.slug) slugs.add(lower(p.slug))
    ;(p.previousSlugs ?? []).forEach((s) => slugs.add(lower(s)))
  })
  return { slugs, ids }
}

/**
 * The slug a listing should be saved with. Keeps the slug it asks for (typed by the admin, or the one
 * it already has) if it is free; otherwise builds a fresh unique one from the title.
 */
export function resolveSlug(item, list) {
  const { slugs, ids } = takenBy(list, item.id)
  const wanted = slugify(item.slug || '')
  if (wanted && !slugs.has(wanted) && !ids.has(wanted)) return wanted
  return uniqueSlug(item, slugs, ids)
}

/** Gives a slug to every listing that lacks one (older saved data). Returns the same array if none did. */
export function ensureSlugs(list) {
  if (list.every((p) => p.slug)) return list
  const taken = { slugs: new Set(), ids: new Set() }
  list.forEach((p) => {
    taken.ids.add(lower(p.id))
    if (p.slug) taken.slugs.add(lower(p.slug))
    ;(p.previousSlugs ?? []).forEach((s) => taken.slugs.add(lower(s)))
  })
  return list.map((p) => {
    if (p.slug) return p
    // its own id isn't "another listing's id"
    const ids = new Set(taken.ids)
    ids.delete(lower(p.id))
    const slug = uniqueSlug(p, taken.slugs, ids)
    taken.slugs.add(slug)
    return { ...p, slug }
  })
}

/** Finds a listing from a URL segment: its slug, an old slug, or (old links) its id. */
export function findByParam(list, param) {
  const key = lower(param ?? '')
  return (
    list.find((p) => p.slug && lower(p.slug) === key) ??
    list.find((p) => (p.previousSlugs ?? []).some((s) => lower(s) === key)) ??
    list.find((p) => lower(p.id) === key)
  )
}
