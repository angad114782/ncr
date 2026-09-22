// Server-Sent Events: a one-way "something changed, go re-fetch" push to connected browsers, so the admin
// panel, agent panel and the public site update without a manual refresh. Chosen over a two-way connection
// (WebSocket / Socket.io) because nothing here needs the browser to push to the server over this channel —
// every write already goes through the normal REST API. SSE is plain HTTP: no extra client library, and the
// browser's built-in EventSource reconnects on its own.
//
// Connections live in memory on THIS process only (see `subscribers` below). That is fine for how this app is
// deployed (pm2 `exec_mode: 'fork'`, `instances: 1` — one Node process, see ecosystem.config.cjs) and is what
// makes 1000+ concurrent connections cheap (each is a few KB: a response object + a scope string, not a thread).
// It stops working correctly the moment there is more than one app process (pm2 cluster mode, or more than one
// server) unless a shared layer (e.g. Redis pub/sub) is added to fan a broadcast out to every process — do not
// switch to cluster mode for this app without adding that first.

const HEARTBEAT_MS = 20_000 // well under nginx's proxy_read_timeout and any load balancer's idle timeout

/** One entry per open connection: { res, scopes: Set<string> }. */
const subscribers = new Set()

/**
 * `scopes` decides which broadcasts a connection receives: 'public' (everyone), 'admin' (any signed-in admin),
 * or `agent:<agentId>` (only that agent). Call once per request, after writing the SSE response headers.
 */
export function subscribe(res, scopes) {
  const sub = { res, scopes: new Set(scopes) }
  subscribers.add(sub)
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n')
    } catch {
      clearInterval(heartbeat)
      subscribers.delete(sub)
    }
  }, HEARTBEAT_MS)
  heartbeat.unref?.()
  const cleanup = () => {
    clearInterval(heartbeat)
    subscribers.delete(sub)
  }
  res.on('close', cleanup)
  res.on('error', cleanup)
  return cleanup
}

/** Sends `event` (a short name like "lead:new") with a JSON payload to every connection subscribed to `scope`. */
export function broadcast(scope, event, data = {}) {
  const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const sub of subscribers) {
    if (!sub.scopes.has(scope)) continue
    try {
      sub.res.write(frame)
    } catch {
      subscribers.delete(sub)
    }
  }
}

/** For the admin health/stats screen and tests — never used to gate anything. */
export const connectionCount = () => subscribers.size
