// A small dependency-free daily-volume chart: bars for the actual count, a line for the 7-day moving average
// (the "trend" — see docs/rules.md §"forecasting": a trend view, not a predictive model).
export default function TrendChart({ data, height = 140, emptyLabel = 'No data yet.' }) {
  if (!data || data.every((d) => d.count === 0)) return <p className="text-secondary text-sm">{emptyLabel}</p>

  const w = 600
  const max = Math.max(1, ...data.map((d) => d.count))
  const barW = w / data.length
  const movingAvg = data.map((_, i) => {
    const win = data.slice(Math.max(0, i - 6), i + 1)
    return win.reduce((s, d) => s + d.count, 0) / win.length
  })
  const points = movingAvg.map((v, i) => `${i * barW + barW / 2},${height - (v / max) * height}`).join(' ')
  const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} role="img" aria-label="Search volume over time">
        {data.map((d, i) => (
          <rect key={d.date} x={i * barW + barW * 0.15} y={height - (d.count / max) * height} width={Math.max(1, barW * 0.7)} height={(d.count / max) * height} fill="var(--color-accent)" opacity={0.3} rx={1.5}>
            <title>{`${fmt(d.date)}: ${d.count}`}</title>
          </rect>
        ))}
        <polyline points={points} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="flex justify-between text-tertiary text-xs mt-1.5">
        <span>{fmt(data[0].date)}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[var(--color-accent)] inline-block rounded-full" /> 7-day trend</span>
        <span>{fmt(data.at(-1).date)}</span>
      </div>
    </div>
  )
}
