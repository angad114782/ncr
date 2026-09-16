import { Link } from 'react-router-dom'
import GlassCard from '../../components/glass/GlassCard'
import PropertyCard from '../../components/property/PropertyCard'
import { useData } from '../../context/DataContext'

export default function Saved() {
  const { properties, savedIds } = useData()
  const savedProperties = properties.filter((p) => savedIds.includes(p.id))

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Saved Properties</h1>
      {savedProperties.length === 0 ? (
        <GlassCard hover={false} className="p-10 text-center text-secondary">
          No saved properties yet. <Link to="/listings" className="text-[var(--color-accent)] font-medium">Browse listings</Link> and tap the heart icon to save.
        </GlassCard>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {savedProperties.map((p) => <PropertyCard key={p.id} property={p} />)}
        </div>
      )}
    </div>
  )
}
