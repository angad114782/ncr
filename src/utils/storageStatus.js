import { useSyncExternalStore } from 'react'

// Tracks localStorage write failures (usually "quota exceeded" after uploading
// images) so the admin panel can warn instead of silently losing edits.
const failed = new Set()
const listeners = new Set()
let snapshot = []

function emit() {
  snapshot = [...failed]
  listeners.forEach((l) => l())
}

export function reportStorageError(key) {
  if (failed.has(key)) return
  failed.add(key)
  emit()
}

export function clearStorageError(key) {
  if (failed.delete(key)) emit()
}

export function useStorageErrors() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => snapshot,
    () => [],
  )
}

/** Approximate size (KB) of everything this app keeps in localStorage. */
export function storageUsageKb() {
  try {
    let chars = 0
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      chars += k.length + (localStorage.getItem(k) || '').length
    }
    return Math.round((chars * 2) / 1024) // UTF-16: 2 bytes per char
  } catch {
    return 0
  }
}
