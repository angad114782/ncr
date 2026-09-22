import { useEffect, useState } from 'react'
import { Info, RefreshCw, Search } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import PieChart from '../../components/charts/PieChart'
import TrendChart from '../../components/charts/TrendChart'
import { USE_API, api } from '../../api/client'

const PERIODS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
]

/**
 * What visitors are searching for, and how it's trending — built from real search events (city, property type,
 * purpose, free text), never guessed. See the disclaimer below: only signed-in accounts' searches reach the
 * server (docs/rules.md §15), so this is a real sample of intent, not literally every search on the site.
 */
export default function SearchAnalytics() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      setData(await api(`/admin/analytics/searches?days=${days}`))
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    if (USE_API) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days])

  if (!USE_API) {
    return (
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1">Search Analytics</h1>
        <p className="text-secondary">What visitors search for shows here once the site is connected to the live server.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Search Analytics</h1>
        <div className="flex items-center gap-2">
          <div className="glass-weak p-1 rounded-full flex">
            {PERIODS.map((p) => (
              <button key={p.value} type="button" onClick={() => setDays(p.value)} className={`px-3.5 py-1.5 rounded-full text-xs font-medium spring ${days === p.value ? 'glass-strong text-[var(--color-accent)]' : 'text-secondary'}`}>{p.label}</button>
            ))}
          </div>
          <GlassButton variant="glass" size="sm" icon={RefreshCw} onClick={load}>Refresh</GlassButton>
        </div>
      </div>
      <p className="text-secondary mb-2">What people are looking for, built from real searches.</p>
      <p className="glass-weak rounded-[12px] px-4 py-2.5 text-xs text-secondary flex items-start gap-2 mb-6">
        <Info size={14} className="shrink-0 mt-0.5" />
        Only a signed-in visitor's searches reach the server (see Admin → Users → a person's Activity) — most
        browsing is anonymous and, by design, never leaves the visitor's own device. Treat these numbers as a
        real sample of intent, not a count of every search on the site.
      </p>

      {error && <p className="text-[var(--color-danger)] text-sm mb-4">{error}</p>}

      {!data ? (
        <p className="text-secondary">Loading…</p>
      ) : (
        <div className="flex flex-col gap-6">
          <GlassCard hover={false} className="p-5 flex items-center gap-4">
            <span className="w-11 h-11 rounded-[14px] glass-strong flex items-center justify-center text-[var(--color-accent)] shrink-0"><Search size={18} /></span>
            <div>
              <p className="text-2xl font-bold">{data.totalSearches.toLocaleString('en-IN')}</p>
              <p className="text-secondary text-sm">searches in the last {data.days} days</p>
            </div>
          </GlassCard>

          <GlassCard hover={false} className="p-6">
            <h3 className="font-semibold mb-1">Search volume over time</h3>
            <p className="text-secondary text-xs mb-4">Daily searches, with a 7-day trend line — no guesswork, just the shape of what already happened.</p>
            <TrendChart data={data.trend} />
          </GlassCard>

          <div className="grid sm:grid-cols-2 gap-6">
            <GlassCard hover={false} className="p-6">
              <h3 className="font-semibold mb-4">Most searched cities</h3>
              <PieChart data={data.byCity} emptyLabel="No city searches yet." />
            </GlassCard>
            <GlassCard hover={false} className="p-6">
              <h3 className="font-semibold mb-4">By property type</h3>
              <PieChart data={data.byType} emptyLabel="No type filters used yet." />
            </GlassCard>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <GlassCard hover={false} className="p-6">
              <h3 className="font-semibold mb-4">Buy vs. Rent</h3>
              <PieChart data={data.byPurpose} size={130} thickness={22} emptyLabel="No searches yet." />
            </GlassCard>
            <GlassCard hover={false} className="p-6">
              <h3 className="font-semibold mb-4">Top searched terms</h3>
              {data.topQueries.length === 0 ? (
                <p className="text-secondary text-sm">No free-text searches yet.</p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {data.topQueries.map((q, i) => (
                    <li key={q.q} className="flex items-center gap-3 text-sm">
                      <span className="w-5 text-tertiary text-xs shrink-0">{i + 1}</span>
                      <span className="flex-1 min-w-0 truncate">{q.q}</span>
                      <span className="text-tertiary text-xs shrink-0">{q.count}×</span>
                    </li>
                  ))}
                </ol>
              )}
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  )
}
