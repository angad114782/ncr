import { Link } from 'react-router-dom'
import GlassButton from '../glass/GlassButton'
import PropertyCard from '../property/PropertyCard'
import { useData } from '../../context/DataContext'

export default function NewestListings({ excludeIds = [] }) {
  const { activeProperties } = useData()

  const newest = [...activeProperties]
    .filter((p) => !excludeIds.includes(p.id))
    .sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate))
    .slice(0, 4)

  if (newest.length === 0) return null

  return (
    <section className="mb-16" aria-labelledby="newest-listings-heading">
      <div className="flex items-center justify-between mb-6">
        <h2 id="newest-listings-heading" className="text-2xl md:text-3xl font-bold">Newest Listings</h2>
        <GlassButton variant="glass" size="sm" as={Link} to="/buy">
          View All
        </GlassButton>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {newest.map((p) => (
          <PropertyCard key={p.id} property={p} />
        ))}
      </div>
    </section>
  )
}
