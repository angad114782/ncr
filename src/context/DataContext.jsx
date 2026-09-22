import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import usePersistedState from '../hooks/usePersistedState'
import { newId } from '../utils/ids'
import { ensureSlugs, resolveSlug } from '../utils/propertySlug'
import { API_BASE, USE_API, api, fetchAll, reportApiError } from '../api/client'
import { useAuth } from './AuthContext'
import snapshot from '../data/snapshot.json'
import propertiesSeed from '../data/properties.json'
import inquiriesSeed from '../data/inquiries.json'
import agentsSeed from '../data/agents.json'
import blogSeed from '../data/blog.json'
import faqsSeed from '../data/faqs.json'
import testimonialsSeed from '../data/testimonials.json'

const DataContext = createContext(null)

// Where the lists start. Local mode: the bundled sample data (then browser storage). API mode: the snapshot
// the site was built from (identical to the pre-rendered HTML, so hydration matches), refreshed from the API
// as soon as the page is interactive.
const SEED = USE_API
  ? { properties: snapshot.properties, agents: snapshot.agents, blog: snapshot.posts, faqs: snapshot.faqs, testimonials: snapshot.testimonials, inquiries: [] }
  : { properties: propertiesSeed, agents: agentsSeed, blog: blogSeed, faqs: faqsSeed, testimonials: testimonialsSeed, inquiries: inquiriesSeed }

// API mode keeps the lists in memory (the server is the database); local mode persists them in the browser.
const useMemoryStore = (_key, initial) => {
  const [value, setValue] = useState(initial)
  return [value, setValue, true]
}
const useStore = USE_API ? useMemoryStore : usePersistedState

const mergeById = (base, extra) => [...new Map([...base, ...extra.filter(Boolean)].map((x) => [x.id, x])).values()]

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
      return { added, updated: items.length - added, ready: Promise.resolve() }
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

/**
 * The same admin operations as makeCrud, but saved on the server. Every change shows up at once in the list
 * (optimistic); the server's answer then replaces it (it assigns ids, slugs and review status). If the server
 * refuses — validation, permission, network — the reason is shown in a toast and the list is re-read, so the
 * screen never keeps something that was not saved.
 */
function makeApiCrud(list, setList, { base, reload, reorderable = false, itemKey = 'item', bulkDelete = true }) {
  const local = makeCrud(list, setList)
  const run = (promise) => promise.catch((err) => { reportApiError(err); reload() })
  const swap = (oldId, saved) => setList((prev) => prev.map((x) => (x.id === oldId ? { ...x, ...saved } : x)))

  const setActive = (ids, active) => {
    local.setActive(ids, active)
    if (bulkDelete) {
      run(api(`${base}/bulk/action`, { method: 'POST', body: { ids, action: active ? 'activate' : 'deactivate' } }).then((d) => {
        if (d.failed?.length) { reportApiError(d.failed.map((f) => f.reason).join(' ')); reload() }
      }))
    } else {
      // an agent switches their own approved listings one by one
      ids.forEach((id) => run(api(`${base}/${id}/active`, { method: 'PATCH', body: { active } }).then((d) => swap(id, d.property))))
    }
  }

  return {
    ...local,
    upsert(item) {
      const exists = list.some((x) => x.id === item.id)
      local.upsert(item)
      run(api(exists ? `${base}/${item.id}` : base, { method: exists ? 'PATCH' : 'POST', body: item }).then((d) => swap(item.id, d[itemKey] ?? d.item)))
      return item
    },
    upsertMany(items) {
      const known = new Set(list.map((x) => x.id))
      const added = items.filter((x) => !known.has(x.id)).length
      local.upsertMany(items) // optimistic — rolled back by run()'s reload() if the request below fails
      // The local list updates immediately either way, so a caller (CsvToolbar) that doesn't check `ready`
      // still sees a table that looks right for a moment — `ready` is what tells it whether that's real.
      const req = bulkDelete
        ? api(`${base}/import/rows`, { method: 'POST', body: { items } })
        : api(`${base}/import`, { method: 'POST', body: { items: items.map(({ id, ...rest }) => rest) } })
      run(req.then(reload))
      return { added, updated: items.length - added, ready: req }
    },
    patch(id, patch) {
      local.patch(id, patch)
      run(api(`${base}/${id}`, { method: 'PATCH', body: patch }).then((d) => swap(id, d[itemKey] ?? d.item)))
    },
    remove(id) {
      local.remove(id)
      run(api(`${base}/${id}`, { method: 'DELETE' }))
    },
    removeMany(ids) {
      local.removeMany(ids)
      if (bulkDelete) run(api(`${base}/bulk/action`, { method: 'POST', body: { ids, action: 'delete' } }))
      else ids.forEach((id) => run(api(`${base}/${id}`, { method: 'DELETE' })))
    },
    setActive,
    toggleActive(id) {
      setActive([id], list.find((x) => x.id === id)?.active === false)
    },
    move(id, dir) {
      const i = list.findIndex((x) => x.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= list.length) return
      const next = [...list]
      ;[next[i], next[j]] = [next[j], next[i]]
      local.move(id, dir)
      if (reorderable) run(api(`${base}/reorder`, { method: 'POST', body: { ids: next.map((x) => x.id) } }))
    },
  }
}

export function DataProvider({ children }) {
  const { user, ready: authReady } = useAuth()
  const [properties, setProperties, propertiesReady] = useStore('re-properties', SEED.properties)
  const [inquiries, setInquiries] = useStore('re-inquiries', SEED.inquiries)
  const [savedIds, setSavedIds] = usePersistedState('re-saved', [])
  const [compareIds, setCompareIds] = usePersistedState('re-compare', [])
  const [recentlyViewedIds, setRecentlyViewedIds] = usePersistedState('re-recent', [])
  const [agents, setAgents] = useStore('re-agents', SEED.agents)
  const [blogPosts, setBlogPosts] = useStore('re-blog', SEED.blog)
  const [faqs, setFaqs] = useStore('re-faqs', SEED.faqs)
  const [testimonials, setTestimonials] = useStore('re-testimonials', SEED.testimonials)

  // API mode: false until the first answer from the server has arrived (or failed). Until then a page for something
  // that is not in the build snapshot (a listing published after the last build) shows a skeleton, not "not found".
  const [dataReady, setDataReady] = useState(!USE_API)

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
    if (!USE_API && propertiesReady && properties.some((p) => !p.slug)) setProperties(ensureSlugs(properties))
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
  const localPropertyCrud = {
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
      return { added, updated: items.length - added, ready: Promise.resolve() }
    },
  }

  // ---- API mode: load from the server, and save every change there ----
  const role = user?.role
  const load = useCallback(async () => {
    try {
      const pub = await api('/public/bootstrap')
      let next = { properties: pub.properties, agents: pub.agents, blog: pub.posts, faqs: pub.faqs, testimonials: pub.testimonials, inquiries: [] }
      if (role === 'admin') {
        const [p, a, b, f, t, l] = await Promise.all(['properties', 'agents', 'blog', 'faqs', 'testimonials', 'leads'].map((k) => fetchAll(`/admin/${k}`)))
        next = { properties: p, agents: a, blog: b, faqs: f, testimonials: t, inquiries: l }
      } else if (role === 'agent') {
        const [own, profile, leads] = await Promise.all([api('/agent/properties'), api('/agent/profile'), fetchAll('/agent/leads')])
        next = { ...next, properties: mergeById(pub.properties, own.items), agents: mergeById(pub.agents, [profile.agent]), inquiries: leads }
      } else if (role) {
        next.inquiries = (await api('/me/inquiries')).items
      }
      setProperties(next.properties)
      setAgents(next.agents)
      setBlogPosts(next.blog)
      setFaqs(next.faqs)
      setTestimonials(next.testimonials)
      setInquiries(next.inquiries)
    } catch {
      /* offline or the API is down: keep showing the snapshot the site was built with */
    } finally {
      setDataReady(true)
    }
  }, [role, setProperties, setAgents, setBlogPosts, setFaqs, setTestimonials, setInquiries])

  useEffect(() => {
    if (USE_API && authReady) load()
  }, [authReady, load])

  // Live updates: a new lead, a listing's review status, or any admin content change re-fetches the lists that
  // moment, instead of everyone having to refresh (backend/src/lib/events.js). Server-Sent Events — one open
  // connection, the server pushes; nothing here sends anything back over it. Coalesced into one reload even when
  // a single action fires more than one event (e.g. approving a listing sends both content:changed and
  // listing:status). The browser's EventSource reconnects on its own if the connection drops.
  useEffect(() => {
    if (!USE_API || !authReady || typeof EventSource === 'undefined') return undefined
    const source = new EventSource(`${API_BASE}/events`, { withCredentials: true })
    let debounce
    const reload = () => {
      clearTimeout(debounce)
      debounce = setTimeout(load, 300)
    }
    for (const name of ['content:changed', 'lead:new', 'listing:status', 'listing:pending']) source.addEventListener(name, reload)
    return () => {
      clearTimeout(debounce)
      source.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, role])

  // Saved homes follow the account: merged in at sign-in, then kept on the server.
  const wasSignedIn = useRef(false)
  useEffect(() => {
    if (!USE_API || !authReady) return
    if (!user) {
      if (wasSignedIn.current) setSavedIds([])
      wasSignedIn.current = false
      return
    }
    wasSignedIn.current = true
    ;(async () => {
      try {
        if (savedIds.length) await api('/me/saved', { method: 'PUT', body: { ids: savedIds } })
        setSavedIds((await api('/me/saved')).ids)
      } catch { /* keep the local list */ }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user?.id])

  const isAgentUser = role === 'agent'
  const crudFor = (list, setList, base, options) => (USE_API && base ? makeApiCrud(list, setList, { base, reload: load, ...options }) : makeCrud(list, setList))
  const propertyCrud = USE_API ? crudFor(properties, setProperties, isAgentUser ? '/agent/properties' : '/admin/properties', { itemKey: 'property', bulkDelete: !isAgentUser }) : localPropertyCrud
  const agentCrud = (() => {
    if (!(USE_API && isAgentUser)) return crudFor(agents, setAgents, '/admin/agents', {})
    // an agent edits only their own public profile
    const local = makeCrud(agents, setAgents)
    const save = (id, patch) => {
      local.patch(id, patch)
      api('/agent/profile', { method: 'PATCH', body: patch }).catch((err) => { reportApiError(err); load() })
    }
    return { ...local, patch: save, upsert: ({ id, ...rest }) => save(id, rest) }
  })()
  const blogCrud = crudFor(blogPosts, setBlogPosts, '/admin/blog', {})
  const faqCrud = crudFor(faqs, setFaqs, '/admin/faqs', { reorderable: true })
  const testimonialCrud = crudFor(testimonials, setTestimonials, '/admin/testimonials', { reorderable: true })
  const inquiryCrud = crudFor(inquiries, setInquiries, isAgentUser ? '/agent/leads' : '/admin/leads', {})

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
    const has = savedIds.includes(propertyId)
    setSavedIds((prev) => (prev.includes(propertyId) ? prev.filter((id) => id !== propertyId) : [...prev, propertyId]))
    if (USE_API && user) api(`/me/saved/${propertyId}`, { method: has ? 'DELETE' : 'POST' }).catch(reportApiError)
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

  /** API mode: sends an enquiry to the server (the server records consent, scores it and notifies the team). */
  const submitLead = (payload) => api('/leads', { method: 'POST', body: payload })

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
        dataReady,
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
        submitLead,
        reloadData: load,
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
