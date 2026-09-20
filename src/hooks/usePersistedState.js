import { useEffect, useState } from 'react'
import { clearStorageError, reportStorageError } from '../utils/storageStatus'

const isPlain = (v) => v && typeof v === 'object' && !Array.isArray(v)

/**
 * Recursively fills gaps in saved data with defaults, so a setting added in a
 * later release still has a value for browsers that saved an older shape.
 * Arrays and primitives from `saved` always win.
 */
export function deepMerge(base, saved) {
  if (saved === undefined) return base
  if (isPlain(base) && isPlain(saved)) {
    const out = { ...base }
    Object.keys(saved).forEach((k) => {
      out[k] = k in base ? deepMerge(base[k], saved[k]) : saved[k]
    })
    return out
  }
  return saved
}

/**
 * useState that survives reloads (localStorage). Set `merge` for object-shaped
 * settings so newly added default keys are filled in. Write failures (quota)
 * are surfaced through storageStatus instead of being swallowed.
 */
export default function usePersistedState(key, initial, { merge = false } = {}) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw == null) return initial
      const parsed = JSON.parse(raw)
      return merge ? deepMerge(initial, parsed) : parsed
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      clearStorageError(key)
    } catch {
      reportStorageError(key)
    }
  }, [key, value])

  return [value, setValue]
}
