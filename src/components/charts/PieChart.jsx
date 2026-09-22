// A small dependency-free donut chart — no charting library needed for one shape.
const PALETTE = ['#674E40', '#A9603C', '#D9A441', '#34C759', '#5B8BA0', '#9B6B9E', '#C9526B', '#4A7C6F']

function polar(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

/** data: [{ label, count }], biggest first. Renders a donut + a legend with counts and percentages. */
export default function PieChart({ data, size = 160, thickness = 28, emptyLabel = 'No data yet.' }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <p className="text-secondary text-sm">{emptyLabel}</p>

  const r = size / 2
  const rInner = r - thickness
  const arcPath = (start, end) => {
    const large = end - start > 180 ? 1 : 0
    const p1 = polar(r, r, r, start)
    const p2 = polar(r, r, r, end)
    const p1i = polar(r, r, rInner, start)
    const p2i = polar(r, r, rInner, end)
    return `M ${p1.x},${p1.y} A ${r},${r} 0 ${large} 1 ${p2.x},${p2.y} L ${p2i.x},${p2i.y} A ${rInner},${rInner} 0 ${large} 0 ${p1i.x},${p1i.y} Z`
  }

  // Cumulative start angle per slice, without mutating a shared variable across iterations.
  const starts = data.reduce((acc, d) => [...acc, (acc.at(-1) ?? 0) + (d.count / total) * 360], [0]).slice(0, -1)
  const slices = data.map((d, i) => {
    const pct = d.count / total
    const start = starts[i]
    const end = start + pct * 360
    // A single 100% slice needs to be split into two arcs — one continuous 360° sweep isn't a valid SVG arc.
    const path = pct >= 0.9995 ? `${arcPath(start, start + 180)} ${arcPath(start + 180, start + 360)}` : arcPath(start, end)
    return { path, color: PALETTE[i % PALETTE.length], label: d.label, count: d.count, pct }
  })

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Breakdown chart">
        {slices.map((s) => <path key={s.label} d={s.path} fill={s.color} />)}
      </svg>
      <ul className="flex flex-col gap-1.5 text-sm min-w-0">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} aria-hidden="true" />
            <span className="truncate">{s.label}</span>
            <span className="text-tertiary text-xs shrink-0">{s.count} · {Math.round(s.pct * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
