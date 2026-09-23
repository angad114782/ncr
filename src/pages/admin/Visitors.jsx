import { useEffect, useState } from 'react'
import { Globe, Info, RefreshCw, Search, Users } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassInput from '../../components/glass/GlassInput'
import GlassButton from '../../components/glass/GlassButton'
import PieChart from '../../components/charts/PieChart'
import { USE_API, api } from '../../api/client'

const LIMIT = 20

/**
 * Real, anonymous traffic — one row per ip per day, with best-effort city/region/pincode
 * (backend/src/lib/geo.js). Separate from Search Analytics (which is signed-in accounts only,
 * docs/rules.md §15): this is IP-level, never linked to an account, and is the same source the
 * public footer counter reads from. Location is approximate — an ISP's registered address, not a
 * street address — never presented as exact.
 */
export default function Visitors() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const load = async (p = page) => {
    setError('')
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
      if (q.trim()) params.set('q', q.trim())
      setData(await api(`/admin/visitors?${params}`))
      setPage(p)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    if (USE_API) load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!USE_API) {
    return (
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1">Visitors</h1>
        <p className="text-secondary">The real-visitor log shows here once the site is connected to the live server.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Visitors</h1>
        <GlassButton variant="glass" size="sm" icon={RefreshCw} onClick={() => load(1)}>Refresh</GlassButton>
      </div>
      <p className="text-secondary mb-2">Real, anonymous site traffic — your own visits while signed in are never counted.</p>
      <p className="glass-weak rounded-[12px] px-4 py-2.5 text-xs text-secondary flex items-start gap-2 mb-6">
        <Info size={14} className="shrink-0 mt-0.5" />
        City/region/pincode are a best-effort estimate from the visitor's IP address — often an ISP's registered
        address, not their street address. One row per IP per day: refreshing or browsing all day counts once.
      </p>

      {error && <p className="text-[var(--color-danger)] text-sm mb-4">{error}</p>}

      {!data ? (
        <p className="text-secondary">Loading…</p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <GlassCard hover={false} className="p-5 flex items-center gap-4">
              <span className="w-11 h-11 rounded-[14px] glass-strong flex items-center justify-center text-[var(--color-accent)] shrink-0"><Users size={18} /></span>
              <div>
                <p className="text-2xl font-bold">{data.allTime.toLocaleString('en-IN')}</p>
                <p className="text-secondary text-sm">real visitors, all time</p>
              </div>
            </GlassCard>
            <GlassCard hover={false} className="p-5 flex items-center gap-4">
              <span className="w-11 h-11 rounded-[14px] glass-strong flex items-center justify-center text-[var(--color-accent)] shrink-0"><Globe size={18} /></span>
              <div>
                <p className="text-2xl font-bold">{data.last7Days.toLocaleString('en-IN')}</p>
                <p className="text-secondary text-sm">in the last 7 days</p>
              </div>
            </GlassCard>
          </div>

          <GlassCard hover={false} className="p-6">
            <h3 className="font-semibold mb-4">Top cities</h3>
            <PieChart data={data.byCity} emptyLabel="No located visits yet." />
          </GlassCard>

          <GlassCard hover={false} className="p-5">
            <form onSubmit={(e) => { e.preventDefault(); load(1) }} className="mb-4">
              <GlassInput icon={Search} placeholder="Search IP, city, region or pincode…" value={q} onChange={(e) => setQ(e.target.value)} />
            </form>

            {data.items.length === 0 ? (
              <p className="text-secondary text-sm py-6 text-center">No visits match.</p>
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-tertiary text-xs uppercase tracking-wide">
                      <th className="pb-2 pr-4">Day</th>
                      <th className="pb-2 pr-4">IP</th>
                      <th className="pb-2 pr-4">City</th>
                      <th className="pb-2 pr-4">Region</th>
                      <th className="pb-2 pr-4">Pincode</th>
                      <th className="pb-2 pr-4">First page</th>
                      <th className="pb-2 text-right">Hits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((v) => (
                      <tr key={v.id} className="border-t border-[var(--glass-border)]">
                        <td className="py-2 pr-4 whitespace-nowrap">{v.day}</td>
                        <td className="py-2 pr-4 font-mono text-xs">{v.ip}</td>
                        <td className="py-2 pr-4">{v.city || '—'}</td>
                        <td className="py-2 pr-4">{v.region || '—'}</td>
                        <td className="py-2 pr-4">{v.pincode || '—'}</td>
                        <td className="py-2 pr-4 max-w-[220px] truncate">{v.path || '—'}</td>
                        <td className="py-2 text-right">{v.hits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data.pages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm text-secondary">
                <GlassButton variant="glass" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</GlassButton>
                <span>Page {page} of {data.pages}</span>
                <GlassButton variant="glass" size="sm" disabled={page >= data.pages} onClick={() => load(page + 1)}>Next</GlassButton>
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  )
}
