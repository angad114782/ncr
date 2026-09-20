import { Agent, Property } from '../models/index.js'
import { badRequest, conflict } from '../lib/errors.js'
import { slugCandidates, slugify } from '../lib/propertySlug.js'
import { formatPriceShort } from '../lib/format.js'
import { newId } from '../lib/ids.js'

const today = () => new Date().toISOString().slice(0, 10)

/** Only these listings are public: on, and approved (a listing without a review status counts as approved). */
export const PUBLIC_FILTER = { active: { $ne: false }, reviewStatus: { $in: ['approved', null] } }

/**
 * The slug a listing is saved with — the same rules as the website (title → + city → + locality →
 * + type / purpose / BHK → number), checked against every other listing's slug, old slugs and id.
 * `wanted` is a slug the admin typed (or the one the listing already has): kept if it is free.
 */
export async function allocateSlug(property, selfId, wanted = '') {
  const { base, candidates } = slugCandidates(property)
  const typed = slugify(wanted || '')
  const list = [...(typed ? [typed] : []), ...candidates]
  const numbered = Array.from({ length: 60 }, (_, i) => `${base}-${i + 2}`)

  const all = [...new Set([...list, ...numbered])]
  const others = await Property.find({ _id: { $ne: selfId }, $or: [{ slug: { $in: all } }, { previousSlugs: { $in: all } }, { _id: { $in: all } }] }, 'slug previousSlugs').lean()
  const taken = new Set(others.flatMap((p) => [p._id, p.slug, ...(p.previousSlugs ?? [])]).map((s) => String(s).toLowerCase()))
  const hit = [...list, ...numbered].find((s) => s && !taken.has(s))
  if (hit) return hit
  return `${base}-${Math.random().toString(36).slice(2, 7)}`
}

/** Normalises numbers / labels the same way the admin form does. */
export function normalizeListing(p) {
  const price = Number(p.price) || 0
  return {
    ...p,
    price,
    priceLabel: p.priceLabel?.trim() || `${formatPriceShort(price)}${p.purpose === 'Rent' ? '/mo' : ''}`,
    reraId: p.reraId?.trim?.() || null,
    postedDate: p.postedDate || today(),
    videoTour: Boolean(p.videoTour || p.videoUrl),
    amenities: (p.amenities ?? []).map((a) => String(a).trim()).filter(Boolean),
    nearby: (p.nearby ?? []).filter((n) => n?.name?.trim()),
  }
}

/**
 * Creates or updates a listing and gives it its slug. `data` has already been validated / whitelisted.
 * A changed slug is remembered in `previousSlugs` so old links keep redirecting.
 */
export async function saveProperty(givenId, data, { create = false } = {}) {
  const id = givenId ?? newId('p')
  for (let attempt = 0; attempt < 4; attempt++) {
    const existing = create ? null : await Property.findById(id)
    if (!create && !existing) return null

    const merged = normalizeListing({ ...(existing?.toObject() ?? {}), ...data })
    const wanted = data.slug !== undefined ? data.slug : existing?.slug
    const slug = await allocateSlug(merged, id, wanted)

    const previous = new Set(existing?.previousSlugs ?? [])
    if (existing?.slug && existing.slug !== slug) previous.add(existing.slug)
    previous.delete(slug)

    try {
      if (existing) {
        existing.set({ ...merged, slug, previousSlugs: previous.size ? [...previous] : undefined })
        await existing.save()
        return existing
      }
      return await Property.create({ ...merged, _id: id, slug })
    } catch (err) {
      if (err?.code === 11000 && attempt < 3) continue // another save took the slug a moment ago — pick again
      throw err
    }
  }
  throw conflict('Could not reserve a unique URL for this listing. Please try again.')
}

/** Finds a listing from a URL segment: slug, an old slug, or (old links) the id. */
export async function findPropertyByParam(param) {
  const key = String(param ?? '').toLowerCase()
  if (!key) return null
  return (
    (await Property.findOne({ slug: key })) ??
    (await Property.findOne({ previousSlugs: key })) ??
    (await Property.findOne({ _id: param }))
  )
}

export const propertyPath = (p) => `/property/${p.slug || p.id}`

/** An agent may only sell through an approved agent record. */
export const approvedAgent = async (agentId) => {
  if (!agentId) return null
  const agent = await Agent.findById(agentId)
  return agent && agent.status === 'approved' ? agent : null
}

/** Guard used by every place that makes a listing live. */
export async function assertAgentApproved(property) {
  if (!property.agentId) return
  const agent = await Agent.findById(property.agentId)
  if (agent && agent.status !== 'approved') {
    throw badRequest(`Approve the agent “${agent.name}” first.`)
  }
}
