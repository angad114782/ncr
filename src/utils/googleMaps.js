import { useEffect, useState } from 'react'

// Loads the Google Maps JavaScript API once (needs a browser key: Admin → Settings → Tracking → Google Maps API key;
// enable "Maps JavaScript API", "Geocoding API" and "Places API (New)" for it).
// status: 'off' (no key) | 'loading' | 'ready' | 'error' (bad / restricted key, billing off, blocked script).
let loading = null
let loadedKey = ''
let authFailed = false

function load(key) {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.google?.maps?.Map && loadedKey === key) return Promise.resolve(window.google.maps)
  if (loading && loadedKey === key) return loading
  loadedKey = key
  authFailed = false
  window.gm_authFailure = () => { authFailed = true; window.dispatchEvent(new Event('gm-auth-failure')) }
  loading = new Promise((resolve, reject) => {
    const cb = `__gmReady${Date.now()}`
    window[cb] = async () => {
      delete window[cb]
      try {
        // the loader is async: pull in what the site uses (map, markers, geocoding, nearby search)
        await Promise.all(['maps', 'marker', 'geocoding', 'places'].map((lib) => window.google.maps.importLibrary(lib)))
        resolve(window.google.maps)
      } catch (err) {
        loading = null
        reject(err)
      }
    }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=${cb}`
    s.async = true
    s.onerror = () => { loading = null; reject(new Error('Google Maps could not be loaded')) }
    document.head.appendChild(s)
  })
  return loading
}

export function useGoogleMaps(key) {
  const [state, setState] = useState(() => (key ? (window?.google?.maps?.Map && loadedKey === key ? 'ready' : 'loading') : 'off'))
  useEffect(() => {
    if (!key) { setState('off'); return undefined }
    let alive = true
    const onFail = () => alive && setState('error')
    window.addEventListener('gm-auth-failure', onFail)
    load(key).then(() => alive && setState(authFailed ? 'error' : 'ready'), () => alive && setState('error'))
    return () => { alive = false; window.removeEventListener('gm-auth-failure', onFail) }
  }, [key])
  return state
}
