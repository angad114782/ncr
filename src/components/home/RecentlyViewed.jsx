import { History } from 'lucide-react'
import PropertyCard from '../property/PropertyCard'
import { useData } from '../../context/DataContext'

export default function RecentlyViewed() {
  const { activeProperties: properties, recentlyViewedIds } = useData()
  const items = recentlyViewedIds
    .map((id) => properties.find((p) => p.id === id))
    .filter(Boolean)
    .slice(0, 4)

  if (items.length === 0) return null

  return (
    <section className="mb-16">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-2">
        <History className="text-[var(--color-accent)]" size={24} /> Recently Viewed
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {items.map((p) => (
          <PropertyCard key={p.id} property={p} />
        ))}
      </div>
    </section>
  )
}
