import { Link } from 'react-router-dom'
import GlassCard from '../glass/GlassCard'
import { useData } from '../../context/DataContext'
import { useSettings } from '../../context/SettingsContext'
import { listingsHeading, listingsPath } from '../../utils/seo'

// Buying-intent search links ("2 BHK Flats for Sale in Mumbai") built only from
// combinations that actually have listings — so every link lands on results,
// and the home page passes real internal-link equity to the city/BHK pages.
export default function PopularSearches() {
  const { activeProperties } = useData()
  const { cities } = useSettings()

  const links = []
  cities.forEach((city) => {
    const inCity = activeProperties.filter((p) => p.city === city)
    ;['Buy', 'Rent'].forEach((purpose) => {
      const set = inCity.filter((p) => p.purpose === purpose)
      if (set.length === 0) return
      links.push({ filters: { purpose, city }, count: set.length })
      ;[2, 3].forEach((n) => {
        const bhk = set.filter((p) => p.beds === n)
        if (bhk.length > 0) links.push({ filters: { purpose, city, beds: String(n) }, count: bhk.length })
      })
    })
  })

  if (links.length === 0) return null

  return (
    <section className="mb-16" aria-labelledby="popular-searches-heading">
      <div className="text-center mb-8">
        <h2 id="popular-searches-heading" className="text-2xl md:text-3xl font-bold mb-2">Popular Property Searches</h2>
        <p className="text-secondary">Jump straight to what buyers and tenants search for most.</p>
      </div>
      <GlassCard hover={false} className="p-6 md:p-8">
        <div className="flex flex-wrap gap-2.5">
          {links.slice(0, 30).map((l) => {
            const label = listingsHeading(l.filters)
            return (
              <Link
                key={label}
                to={listingsPath(l.filters)}
                className="glass-weak rounded-full px-4 py-2 text-sm hover:text-[var(--color-accent)] spring hover:scale-[1.03]"
              >
                {label} <span className="text-tertiary">({l.count})</span>
              </Link>
            )
          })}
        </div>
      </GlassCard>
    </section>
  )
}
