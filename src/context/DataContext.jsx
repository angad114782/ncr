import { createContext, useContext, useEffect, useRef } from 'react'
import usePersistedState from '../hooks/usePersistedState'
import { newId } from '../utils/ids'
import { ensureSlugs, resolveSlug } from '../utils/propertySlug'
import propertiesSeed from '../data/properties.json'
import inquiriesSeed from '../data/inquiries.json'
import agentsSeed from '../data/agents.json'
import blogSeed from '../data/blog.json'
import faqsSeed from '../data/faqs.json'
import testimonialsSeed from '../data/testimonials.json'

const DataContext = createContext(null)

/**
 * Same admin operations for every managed collection: add / edit (upsert),
 * bulk upsert (CSV), delete, activate / deactivate, reorder.
 * Items are "active" unless `active === false`.
 */
function makeCrud(list, setList) {
  const apply = (fn) => setList((prev) => fn(prev))
  return {
    upsert(item) {
      apply((prev) => (prev.some((x) => x.id === item.id) ? prev.map((x) => (x.id === item.id ? { ...x, ...item } : x)) : [item, ...prev]))
      return item
    },
    // CSV import: rows matching an existing id update it, others are added. Returns counts.
    upsertMany(items) {
      const existing = new Set(list.map((x) => x.id))
      const added = items.filter((x) => !existing.has(x.id)).length
      apply((prev) => {
        const byId = new Map(items.map((x) => [x.id, x]))
        const updated = prev.map((x) => (byId.has(x.id) ? { ...x, ...byId.get(x.id) } : x))
        const known = new Set(prev.map((x) => x.id))
        return [...items.filter((x) => !known.has(x.id)), ...updated]
      })
      return { added, updated: items.length - added }
    },
    patch: (id, patch) => apply((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    remove: (id) => apply((prev) => prev.filter((x) => x.id !== id)),
    removeMany: (ids) => apply((prev) => prev.filter((x) => !ids.includes(x.id))),
    setActive: (ids, active) => apply((prev) => prev.map((x) => (ids.includes(x.id) ? { ...x, active } : x))),
    toggleActive: (id) => apply((prev) => prev.map((x) => (x.id === id ? { ...x, active: x.active === false } : x))),
    move: (id, dir) =>
      apply((prev) => {
        const i = prev.findIndex((x) => x.id === id)
        const j = i + dir
        if (i < 0 || j < 0 || j >= prev.length) return prev
        const next = [...prev]
        ;[next[i], next[j]] = [next[j], next[i]]
        return next
      }),
    replaceAll: (items) => setList(items),
  }
}

export function DataProvider({ children }) {
  const [properties, setProperties, propertiesReady] = usePersistedState('re-properties', propertiesSeed)
  const [inquiries, setInquiries] = usePersistedState('re-inquiries', inquiriesSeed)
  const [savedIds, setSavedIds] = usePersistedState('re-saved', [])
  const [compareIds, setCompareIds] = usePersistedState('re-compare', [])
  const [recentlyViewedIds, setRecentlyViewedIds] = usePersistedState('re-recent', [])
  const [agents, setAgents] = usePersistedState('re-agents', agentsSeed)
  const [blogPosts, setBlogPosts] = usePersistedState('re-blog', blogSeed)
  const [faqs, setFaqs] = usePersistedState('re-faqs', faqsSeed)
  const [testimonials, setTestimonials] = usePersistedState('re-testimonials', testimonialsSeed)

  const isActive = (x) => x.active !== false

  // What visitors see: hidden / draft / unapproved items never leak to public pages.
  // (a listing an agent posted stays hidden until the admin approves it — reviewStatus missing = approved)
  const activeProperties = properties.filter((p) => isActive(p) && (p.reviewStatus ?? 'approved') === 'approved')
  const approvedAgents = agents.filter((a) => isActive(a) && a.status !== 'pending' && a.status !== 'rejected')
  const activeBlogPosts = blogPosts.filter(isActive).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  const activeFaqs = faqs.filter(isActive)
  const activeTestimonials = testimonials.filter(isActive)

  // Listings saved before slugs existed get one (from their title) as soon as the saved data is loaded.
  useEffect(() => {
    if (propertiesReady && properties.some((p) => !p.slug)) setProperties(ensureSlugs(properties))
  }, [propertiesReady, properties, setProperties])

  // Every save gives the listing a readable, unique URL slug (see utils/propertySlug.js). The latest list
  // is kept in a ref so several saves in a row (CSV import) don't hand out the same slug twice.
  const latest = useRef(properties)
  latest.current = properties
  const baseCrud = makeCrud(properties, setProperties)
  const stampSlug = (item, list) => {
    const prev = list.find((x) => x.id === item.id)
    const slug = resolveSlug({ ...item, slug: item.slug ?? prev?.slug }, list)
    // old slugs keep working as redirects — but only for a listing that already existed (a duplicate starts clean)
    const previousSlugs = prev
      ? [...new Set([...(item.previousSlugs ?? prev.previousSlugs ?? []), ...(prev.slug && prev.slug !== slug ? [prev.slug] : [])])].filter((s) => s !== slug)
      : []
    return { ...item, slug, ...(previousSlugs.length ? { previousSlugs } : {}) }
  }
  const putProperty = (list, item) => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? { ...x, ...item } : x)) : [item, ...list])
  const propertyCrud = {
    ...baseCrud,
    upsert(item) {
      const stamped = stampSlug(item, latest.current)
      const next = putProperty(latest.current, stamped)
      latest.current = next
      setProperties(next)
      return stamped
    },
    upsertMany(items) {
      const known = new Set(latest.current.map((x) => x.id))
      let next = latest.current
      items.forEach((item) => { next = putProperty(next, stampSlug(item, next)) })
      latest.current = next
      setProperties(next)
      const added = items.filter((x) => !known.has(x.id)).length
      return { added, updated: items.length - added }
    },
  }
  const agentCrud = makeCrud(agents, setAgents)
  const blogCrud = makeCrud(blogPosts, setBlogPosts)
  const faqCrud = makeCrud(faqs, setFaqs)
  const testimonialCrud = makeCrud(testimonials, setTestimonials)
  const inquiryCrud = makeCrud(inquiries, setInquiries)

  const toggleCompare = (propertyId) => {
    setCompareIds((prev) => {
      if (prev.includes(propertyId)) return prev.filter((id) => id !== propertyId)
      if (prev.length >= 3) return prev
      return [...prev, propertyId]
    })
  }

  const clearCompare = () => setCompareIds([])

  const trackRecentlyViewed = (propertyId) => {
    setRecentlyViewedIds((prev) => [propertyId, ...prev.filter((id) => id !== propertyId)].slice(0, 8))
  }

  const toggleSaved = (propertyId) => {
    setSavedIds((prev) =>
      prev.includes(propertyId) ? prev.filter((id) => id !== propertyId) : [...prev, propertyId]
    )
  }

  const addInquiry = (inquiry) => {
    const newInquiry = {
      id: newId('i'),
      status: 'Pending',
      date: new Date().toISOString().slice(0, 10),
      ...inquiry,
    }
    setInquiries((prev) => [newInquiry, ...prev])
    return newInquiry
  }

  const updateInquiryStatus = (id, status) => inquiryCrud.patch(id, { status })
  const deleteInquiry = (id) => inquiryCrud.remove(id)

  const addProperty = (property) => {
    const newProperty = { id: newId('p'), featured: false, active: true, images: [], amenities: [], ...property }
    propertyCrud.upsert(newProperty)
    return newProperty
  }

  /** Bulk-add (CSV import). Each item gets a fresh unique id. */
  const addProperties = (items) => {
    const newProperties = items.map((item) => ({ id: newId('p'), featured: false, active: true, images: [], amenities: [], ...item }))
    propertyCrud.upsertMany(newProperties)
    return newProperties
  }

  const updateProperty = (id, patch) => propertyCrud.patch(id, patch)
  const togglePropertyActive = (id) => propertyCrud.toggleActive(id)
  const deleteProperty = (id) => propertyCrud.remove(id)
  const updateAgentStatus = (id, status) => agentCrud.patch(id, { status })

  /** Put a collection back to the bundled sample content. */
  const restoreSeeds = (name) => {
    const map = {
      properties: () => setProperties(propertiesSeed),
      agents: () => setAgents(agentsSeed),
      blog: () => setBlogPosts(blogSeed),
      faqs: () => setFaqs(faqsSeed),
      testimonials: () => setTestimonials(testimonialsSeed),
      inquiries: () => setInquiries(inquiriesSeed),
    }
    map[name]?.()
  }

  return (
    <DataContext.Provider
      value={{
        properties,
        activeProperties,
        inquiries,
        savedIds,
        compareIds,
        recentlyViewedIds,
        agents,
        approvedAgents,
        blogPosts,
        activeBlogPosts,
        faqs,
        activeFaqs,
        testimonials,
        activeTestimonials,
        propertyCrud,
        agentCrud,
        blogCrud,
        faqCrud,
        testimonialCrud,
        inquiryCrud,
        restoreSeeds,
        toggleSaved,
        toggleCompare,
        clearCompare,
        trackRecentlyViewed,
        addInquiry,
        updateInquiryStatus,
        deleteInquiry,
        addProperty,
        addProperties,
        updateProperty,
        togglePropertyActive,
        deleteProperty,
        updateAgentStatus,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
