import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import GlassCard from '../glass/GlassCard'
import { useData } from '../../context/DataContext'
import { useSettings } from '../../context/SettingsContext'
import { landingCombos, listingsPath } from '../../utils/listingsUrl'
import { listingsHeading } from '../../utils/seo'

/**
 * "Explore related searches" — dynamic internal links into the city / BHK / type landing pages.
 * Only pages that actually have listings are linked, so every link Googlebot follows is a real page.
 *
 *   <ExploreLinks property={p} />   listing page → same city, BHK, type, other purpose, other cities
 *   <ExploreLinks text="…" />       article → the cities it mentions (or the busiest cities)
 */
export default function ExploreLinks({ property, text = '', title = 'Explore related searches', className = '', max = 8 }) {
  const { activeProperties } = useData()
  const { cities, propertyTypes: types } = useSettings()

  const links = useMemo(() => {
    const available = new Map(landingCombos(activeProperties, cities, types).map((l) => [l.path, l]))
    const candidates = []

    if (property) {
      const { purpose, city, type, beds } = property
      const other = purpose === 'Rent' ? 'Buy' : 'Rent'
      candidates.push(
        { purpose, city },
        beds ? { purpose, city, beds: String(Math.min(beds, 4)) } : null,
        { purpose, city, type },
        { purpose, type },
        beds ? { purpose, beds: String(Math.min(beds, 4)) } : null,
        { purpose: other, city },
        ...cities.filter((c) => c !== city).map((c) => ({ purpose, city: c })),
      )
    } else {
      const lower = text.toLowerCase()
      const mentioned = cities.filter((c) => lower.includes(c.toLowerCase()))
      const busiest = [...cities].sort(
        (a, b) => activeProperties.filter((p) => p.city === b).length - activeProperties.filter((p) => p.city === a).length,
      )
      ;(mentioned.length ? mentioned : busiest).slice(0, 3).forEach((city) => {
        candidates.push({ purpose: 'Buy', city }, { purpose: 'Rent', city }, { purpose: 'Buy', city, beds: '2' }, { purpose: 'Buy', city, beds: '3' })
      })
      candidates.push({ purpose: 'Buy' }, { purpose: 'Rent' })
    }

    const seen = new Set()
    return candidates
      .filter(Boolean)
      .map((filters) => ({ filters, path: listingsPath(filters) }))
      .filter((l) => available.has(l.path) && !seen.has(l.path) && seen.add(l.path))
      .slice(0, max)
  }, [property, text, activeProperties, cities, types, max])

  if (links.length === 0) return null

  return (
    <section className={className} aria-label={title}>
      <h2 className="text-xl md:text-2xl font-bold mb-4">{title}</h2>
      <GlassCard hover={false} className="p-5">
        <div className="flex flex-wrap gap-2.5">
          {links.map((l) => (
            <Link key={l.path} to={l.path} className="glass-weak rounded-full px-4 py-2 text-sm flex items-center gap-1.5 hover:text-[var(--color-accent)] spring hover:scale-[1.03]">
              <MapPin size={13} /> {listingsHeading(l.filters)}
            </Link>
          ))}
        </div>
      </GlassCard>
    </section>
  )
}
