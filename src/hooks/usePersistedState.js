import { useEffect, useLayoutEffect, useState } from 'react'
import { clearStorageError, reportStorageError } from '../utils/storageStatus'

const isPlain = (v) => v && typeof v === 'object' && !Array.isArray(v)

// useLayoutEffect warns on the server; it is a no-op there, so use a plain effect instead.
export const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

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
 * useState that survives reloads (localStorage).
 *
 * The FIRST render always uses `initial` — on the server (pre-rendering) and in the browser
 * — so the pre-rendered HTML that crawlers read hydrates without mismatches. Saved values
 * are loaded in a layout effect, i.e. before the browser paints, so visitors never see the
 * defaults flash. Nothing is written back to storage until the saved value has been loaded.
 *
 * Set `merge` for object-shaped settings so newly added default keys are filled in.
 * Write failures (quota) are surfaced through storageStatus instead of being swallowed.
 */
export default function usePersistedState(key, initial, { merge = false } = {}) {
  const [value, setValue] = useState(initial)
  const [ready, setReady] = useState(false)

  useIsoLayoutEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw != null) {
        const parsed = JSON.parse(raw)
        setValue(merge ? deepMerge(initial, parsed) : parsed)
      }
    } catch {
      /* unreadable or blocked storage → keep defaults */
    }
    setReady(true)
    // initial / merge are constants per call site; only the key identifies the record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(key, JSON.stringify(value))
      clearStorageError(key)
    } catch {
      reportStorageError(key)
    }
  }, [key, value, ready])

  // `ready` flips to true once the saved value has been read (see AuthContext / ProtectedRoute).
  return [value, setValue, ready]
}
