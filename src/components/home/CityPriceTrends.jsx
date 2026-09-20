import { Link } from 'react-router-dom'
import { IndianRupee } from 'lucide-react'
import GlassCard from '../glass/GlassCard'
import { useData } from '../../context/DataContext'
import { listingsPath } from '../../utils/seo'

export default function CityPriceTrends() {
  const { activeProperties } = useData()

  const rates = Object.values(
    activeProperties.reduce((acc, p) => {
      if (p.purpose !== 'Buy' || !p.areaSqft) return acc
      acc[p.city] = acc[p.city] || { city: p.city, total: 0, count: 0 }
      acc[p.city].total += p.price / p.areaSqft
      acc[p.city].count += 1
      return acc
    }, {})
  )
    .map((r) => ({ ...r, avgPerSqft: Math.round(r.total / r.count) }))
    .sort((a, b) => b.avgPerSqft - a.avgPerSqft)

  if (rates.length === 0) return null

  return (
    <section className="mb-16" aria-labelledby="price-trends-heading">
      <div className="text-center mb-8">
        <h2 id="price-trends-heading" className="text-2xl md:text-3xl font-bold mb-2">
          Average Property Rates by City
        </h2>
        <p className="text-secondary">Price per sq. ft. for sale listings, based on current inventory.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {rates.map((r) => (
          <GlassCard
            key={r.city}
            as={Link}
            to={listingsPath({ purpose: 'Buy', city: r.city })}
            className="p-5 text-left block"
          >
            <IndianRupee className="text-[var(--color-accent)] mb-3" size={20} />
            <h3 className="font-semibold">{r.city}</h3>
            <p className="text-sm font-medium mt-1">₹{r.avgPerSqft.toLocaleString('en-IN')}/sqft</p>
            <p className="text-tertiary text-xs mt-0.5">avg. of {r.count} listing{r.count > 1 ? 's' : ''}</p>
          </GlassCard>
        ))}
      </div>
    </section>
  )
}
