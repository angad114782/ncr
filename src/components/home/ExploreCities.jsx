import { Link } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import GlassCard from '../glass/GlassCard'
import { useData } from '../../context/DataContext'
import { useSettings } from '../../context/SettingsContext'
import { listingsPath } from '../../utils/seo'

export default function ExploreCities() {
  const { activeProperties } = useData()
  const { cities } = useSettings()

  return (
    <section className="mb-16" aria-labelledby="explore-cities-heading">
      <div className="text-center mb-8">
        <h2 id="explore-cities-heading" className="text-2xl md:text-3xl font-bold mb-2">
          Explore Properties by City
        </h2>
        <p className="text-secondary">Handpicked homes and commercial spaces across Delhi NCR and other major Indian cities.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {cities.map((city) => {
          const count = activeProperties.filter((p) => p.city === city).length
          return (
            <GlassCard key={city} className="p-5 text-left">
              <Link to={listingsPath({ purpose: 'Buy', city })} className="block">
                <Building2 className="text-[var(--color-accent)] mb-3" size={22} />
                <h3 className="font-semibold">{city}</h3>
                <p className="text-secondary text-xs mt-1">{count} propert{count === 1 ? 'y' : 'ies'}</p>
              </Link>
              <p className="text-xs mt-3 flex gap-3 font-medium text-[var(--color-accent)]">
                <Link to={listingsPath({ purpose: 'Buy', city })} className="hover:underline">Buy</Link>
                <Link to={listingsPath({ purpose: 'Rent', city })} className="hover:underline">Rent</Link>
              </p>
            </GlassCard>
          )
        })}
      </div>
    </section>
  )
}
