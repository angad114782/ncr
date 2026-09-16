import { useMemo } from 'react'
import { Gauge, TrendingDown, TrendingUp } from 'lucide-react'
import GlassCard from '../glass/GlassCard'
import { useData } from '../../context/DataContext'

export default function PriceInsight({ property }) {
  const { properties } = useData()

  const insight = useMemo(() => {
    // Only compare within the same city + purpose — cross-city price/sqft
    // comparisons are misleading since markets differ wildly (e.g. Mumbai vs Pune).
    const sameTypeCityPeers = properties.filter(
      (p) => p.id !== property.id && p.city === property.city && p.purpose === property.purpose && p.type === property.type
    )
    const sameCityPeers = properties.filter(
      (p) => p.id !== property.id && p.city === property.city && p.purpose === property.purpose
    )

    const peers = sameTypeCityPeers.length > 0 ? sameTypeCityPeers : sameCityPeers
    if (peers.length === 0) return null

    const avgPerSqft = peers.reduce((sum, p) => sum + p.price / p.areaSqft, 0) / peers.length
    const thisPerSqft = property.price / property.areaSqft
    const diffPct = ((thisPerSqft - avgPerSqft) / avgPerSqft) * 100
    const scope = sameTypeCityPeers.length > 0 ? `${property.type} in ${property.city}` : property.city

    return { avgPerSqft, thisPerSqft, diffPct, sampleSize: peers.length, scope }
  }, [properties, property])

  if (!insight) return null

  const isBelow = insight.diffPct < 0
  const label = isBelow ? 'Below' : 'Above'
  const color = isBelow ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'
  const Icon = isBelow ? TrendingDown : TrendingUp

  return (
    <GlassCard hover={false} className="p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Gauge size={18} className="text-[var(--color-accent)]" /> Price Insight
      </h3>

      <div className={`glass-weak rounded-[16px] p-4 flex items-center gap-3 mb-3`}>
        <span className={`w-10 h-10 rounded-full glass-strong flex items-center justify-center shrink-0 ${color}`}>
          <Icon size={18} />
        </span>
        <div>
          <p className={`font-semibold ${color}`}>
            {Math.abs(insight.diffPct).toFixed(1)}% {label} {insight.scope} Average
          </p>
          <p className="text-tertiary text-xs">
            Based on {insight.sampleSize} comparable {property.purpose.toLowerCase()} listing{insight.sampleSize > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="glass-weak rounded-[14px] p-3 text-center">
          <p className="text-tertiary text-xs">This Property</p>
          <p className="font-semibold">₹{Math.round(insight.thisPerSqft).toLocaleString('en-IN')}/sqft</p>
        </div>
        <div className="glass-weak rounded-[14px] p-3 text-center">
          <p className="text-tertiary text-xs">{insight.scope} Average</p>
          <p className="font-semibold">₹{Math.round(insight.avgPerSqft).toLocaleString('en-IN')}/sqft</p>
        </div>
      </div>
    </GlassCard>
  )
}
