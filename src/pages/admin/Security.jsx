import { useEffect, useState } from 'react'
import { Ban, Globe, Phone, RefreshCw, Search, ShieldAlert, ShieldOff } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import { USE_API, api } from '../../api/client'

const REASON_LABEL = {
  auth_abuse: 'Too many login/sign-up attempts',
  form_spam: 'Too many form submissions',
  otp_never_verified: 'Kept asking for a code, never confirmed it',
}

function Status({ item }) {
  if (item.permanent) {
    return <span className="glass-strong px-2.5 py-1 rounded-full text-xs font-semibold text-[var(--color-danger)]">Permanently blocked</span>
  }
  const until = item.blockedUntil && new Date(item.blockedUntil)
  if (until && until > new Date()) {
    return <span className="glass-strong px-2.5 py-1 rounded-full text-xs font-semibold text-[var(--color-warning)]">Blocked until {until.toLocaleString('en-IN')}</span>
  }
  return <span className="glass-weak px-2.5 py-1 rounded-full text-xs text-secondary">Expired — not currently blocked</span>
}

/**
 * The escalating block ladder that protects login/sign-up and the public forms from robotic attacks and repeated
 * junk (`backend/src/lib/security-block.js`): 24h → 48h → 7 days → permanent, per IP or phone number. The real
 * admin account can never be blocked by this. Unblock a false positive here (a shared office/mobile-carrier IP,
 * a number that turned out to be a real person).
 */
export default function Security() {
  const [items, setItems] = useState(null)
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  const load = async (q = query) => {
    setError('')
    try {
      const data = await api(`/admin/security/blocks${q ? `?q=${encodeURIComponent(q)}` : ''}&limit=100`)
      setItems(data.items)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    if (USE_API) load('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    load(query)
  }

  const handleUnblock = async (item) => {
    setBusyId(item.id)
    try {
      const { item: updated } = await api(`/admin/security/blocks/${item.id}/unblock`, { method: 'POST' })
      setItems((prev) => prev.map((x) => (x.id === item.id ? updated : x)))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId('')
    }
  }

  if (!USE_API) {
    return (
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1">Security</h1>
        <p className="text-secondary">Blocked IPs and phone numbers show here once the site is connected to the live server.</p>
      </div>
    )
  }

  const blockedNow = (items ?? []).filter((i) => i.permanent || (i.blockedUntil && new Date(i.blockedUntil) > new Date()))

  return (
    <div>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Security</h1>
        <GlassButton variant="glass" size="sm" icon={RefreshCw} onClick={() => load()}>Refresh</GlassButton>
      </div>
      <p className="text-secondary mb-6">
        Repeated robotic attempts at login/sign-up or repeated junk on a form get an IP or phone number blocked for 24 hours,
        then 48 hours, then 7 days, then permanently. {blockedNow.length > 0 ? `${blockedNow.length} currently blocked.` : 'Nothing is currently blocked.'} The admin account is never affected.
      </p>

      <form onSubmit={handleSearch} className="glass-weak rounded-full flex items-center gap-2 px-4 h-10 mb-5 max-w-sm">
        <Search size={15} className="text-tertiary" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search an IP or phone number…" aria-label="Search blocks" className="bg-transparent outline-none w-full text-sm" />
      </form>

      {error && <p className="text-[var(--color-danger)] text-sm mb-4">{error}</p>}

      {items === null ? (
        <p className="text-secondary">Loading…</p>
      ) : items.length === 0 ? (
        <GlassCard hover={false} className="p-8 text-center text-secondary">
          <ShieldAlert className="mx-auto mb-2 text-tertiary" size={28} />
          No blocks recorded{query ? ' for that search' : ' yet'}.
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <GlassCard key={item.id} hover={false} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
              <span className="w-10 h-10 rounded-[12px] glass-weak flex items-center justify-center shrink-0 text-secondary">
                {item.kind === 'ip' ? <Globe size={17} /> : <Phone size={17} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold flex items-center gap-2 flex-wrap">
                  <span className="font-mono">{item.value}</span>
                  <Status item={item} />
                </p>
                <p className="text-secondary text-sm mt-1">
                  {REASON_LABEL[item.reason] ?? item.reason} · strike {item.strikes} · last {new Date(item.lastOffenseAt).toLocaleString('en-IN')}
                </p>
                {item.unblockedAt && (
                  <p className="text-tertiary text-xs mt-1">Unblocked {new Date(item.unblockedAt).toLocaleString('en-IN')}</p>
                )}
              </div>
              <GlassButton
                variant="glass"
                size="sm"
                icon={ShieldOff}
                disabled={!item.permanent && !(item.blockedUntil && new Date(item.blockedUntil) > new Date())}
                loading={busyId === item.id}
                loadingText="Unblocking…"
                onClick={() => handleUnblock(item)}
              >
                Unblock
              </GlassButton>
            </GlassCard>
          ))}
        </div>
      )}

      <p className="text-tertiary text-xs mt-6 flex items-center gap-1.5">
        <Ban size={13} /> Blocking is by IP or phone number — a shared office network or a number reassigned later to someone else can be caught by mistake. Unblock it here if that happens.
      </p>
    </div>
  )
}
