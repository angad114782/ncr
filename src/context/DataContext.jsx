import { createContext, useContext, useEffect, useState } from 'react'
import propertiesSeed from '../data/properties.json'
import inquiriesSeed from '../data/inquiries.json'
import agentsSeed from '../data/agents.json'

const DataContext = createContext(null)

function usePersistedState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* ignore */
    }
  }, [key, value])
  return [value, setValue]
}

export function DataProvider({ children }) {
  const [properties, setProperties] = usePersistedState('re-properties', propertiesSeed)
  const [inquiries, setInquiries] = usePersistedState('re-inquiries', inquiriesSeed)
  const [savedIds, setSavedIds] = usePersistedState('re-saved', [])
  const [compareIds, setCompareIds] = usePersistedState('re-compare', [])
  const [recentlyViewedIds, setRecentlyViewedIds] = usePersistedState('re-recent', [])
  const [agents, setAgents] = usePersistedState('re-agents', agentsSeed)

  const activeProperties = properties.filter((p) => p.active !== false)
  const approvedAgents = agents.filter((a) => a.status !== 'pending' && a.status !== 'rejected')

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
      id: `i${Date.now()}`,
      status: 'Pending',
      date: new Date().toISOString().slice(0, 10),
      ...inquiry,
    }
    setInquiries((prev) => [newInquiry, ...prev])
    return newInquiry
  }

  const updateInquiryStatus = (id, status) => {
    setInquiries((prev) => prev.map((inq) => (inq.id === id ? { ...inq, status } : inq)))
  }

  const deleteInquiry = (id) => {
    setInquiries((prev) => prev.filter((inq) => inq.id !== id))
  }

  const addProperty = (property) => {
    const newProperty = { id: `p${Date.now()}`, featured: false, active: true, images: [], amenities: [], ...property }
    setProperties((prev) => [newProperty, ...prev])
    return newProperty
  }

  /** Bulk-add (CSV import). Each item gets a fresh unique id. */
  const addProperties = (items) => {
    const now = Date.now()
    const newProperties = items.map((item, i) => ({
      id: `p${now}${i}`,
      featured: false,
      active: true,
      images: [],
      amenities: [],
      ...item,
    }))
    setProperties((prev) => [...newProperties, ...prev])
    return newProperties
  }

  const updateProperty = (id, patch) => {
    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  const togglePropertyActive = (id) => {
    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, active: p.active === false } : p)))
  }

  const deleteProperty = (id) => {
    setProperties((prev) => prev.filter((p) => p.id !== id))
  }

  const updateAgentStatus = (id, status) => {
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
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
