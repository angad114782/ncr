// The website's connection to the backend API (see backend/README.md).
//
// API mode is switched on at build time with VITE_USE_API=true (the production build does this — see
// .env.production). With it off, the site keeps working on its own with browser storage, exactly as before,
// which is handy for developing the front end without the backend running.
//
// Requests use relative URLs (`/api/...`): nginx proxies /api and /uploads to the backend (deploy/), and in
// development the Vite dev server does. Same origin ⇒ the login cookie needs no CORS.

export const USE_API = import.meta.env.VITE_USE_API === 'true'
const BASE = String(import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

/** JSON request. Pass `form` (FormData) for uploads. Throws ApiError with the server's message. */
export async function api(path, { method = 'GET', body, form, keepalive, signal } = {}) {
  const options = { method, credentials: 'include', headers: {}, keepalive, signal }
  if (form) options.body = form
  else if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }
  let res
  try {
    res = await fetch(`${BASE}${path}`, options)
  } catch {
    throw new ApiError(0, 'network', 'Could not reach the server. Check your connection and try again.')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data?.error?.code ?? 'error', data?.error?.message ?? `Something went wrong (${res.status}).`, data?.error?.details)
  // 200 but not JSON: the request never reached the API (e.g. nginx answered with the website's index.html because
  // /api is not proxied yet). Treat it as an error so callers keep their built-in data instead of crashing on `null`.
  if (data === null && res.status !== 204) throw new ApiError(res.status, 'bad_response', 'The server did not return data. Is the API running and proxied at /api?')
  return data
}

/** Every page of a list endpoint (admin lists are paginated). */
export async function fetchAll(path, { limit = 100 } = {}) {
  const items = []
  const glue = path.includes('?') ? '&' : '?'
  for (let page = 1; page <= 200; page++) {
    const data = await api(`${path}${glue}limit=${limit}&page=${page}`)
    items.push(...(data.items ?? []))
    if (page >= (data.pages ?? 1)) break
  }
  return items
}

/* ---- errors from background saves are shown in a toast (components/layout/ApiToast.jsx) ---- */
const bus = typeof EventTarget !== 'undefined' ? new EventTarget() : null

export function reportApiError(err) {
  const message = err instanceof Error ? err.message : String(err)
  bus?.dispatchEvent(new CustomEvent('api-error', { detail: message }))
}

export function onApiError(listener) {
  if (!bus) return () => {}
  const handler = (e) => listener(e.detail)
  bus.addEventListener('api-error', handler)
  return () => bus.removeEventListener('api-error', handler)
}
