import { Sparkles } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import PropertyCard from '../property/PropertyCard'
import GlassButton from '../glass/GlassButton'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { useInterest } from '../../context/InterestContext'
import { matchScore } from '../../utils/interest'

/**
 * "Picked for you" — homes that match what this visitor has been looking at (from their own
 * activity on this device). Renders nothing until they have shown some interest, so the
 * pre-rendered page and first-time visitors are unaffected.
 */
export default function RecommendedForYou({ title = 'Picked for you', max = 4 }) {
  const { activeProperties } = useData()
  const { user } = useAuth()
  const { summary } = useInterest()
  const outlet = useOutletContext()

  if (!summary.hasSignal) return null

  const items = activeProperties
    .filter((p) => !summary.viewedIds.includes(p.id))
    .map((p) => ({ p, score: matchScore(p, summary) }))
    .filter((x) => x.score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.p)

  if (items.length === 0) return null

  return (
    <section className="mb-16" aria-labelledby="picked-heading">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 id="picked-heading" className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Sparkles className="text-[var(--color-accent)]" size={24} /> {title}
          </h2>
          <p className="text-secondary text-sm mt-1">Because you have been looking at {summary.focus}.</p>
        </div>
        {!user && outlet?.openAuth && (
          <GlassButton variant="glass" size="sm" onClick={() => outlet.openAuth('signup', 'picked')}>
            Get new matches on WhatsApp
          </GlassButton>
        )}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {items.map((p) => <PropertyCard key={p.id} property={p} />)}
      </div>
    </section>
  )
}
