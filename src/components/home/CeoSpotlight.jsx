import { Link } from 'react-router-dom'
import { Award, Quote } from 'lucide-react'
import GlassCard from '../glass/GlassCard'
import GlassButton from '../glass/GlassButton'
import CeoAvatar from '../company/CeoAvatar'
import { useSettings } from '../../context/SettingsContext'

export default function CeoSpotlight() {
  const { company } = useSettings()
  const { ceo } = company
  return (
    <section className="mb-16" aria-labelledby="ceo-heading">
      <GlassCard hover={false} strong className="p-6 md:p-10">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 md:items-center">
          <div className="flex flex-col items-center text-center shrink-0">
            <CeoAvatar className="w-28 h-28 text-4xl mb-3" />
            <h2 id="ceo-heading" className="font-bold text-lg">{ceo.name}</h2>
            <p className="text-[var(--color-accent)] text-sm font-semibold">{ceo.title}, {company.name}</p>
            <span className="glass-weak rounded-full px-3 py-1 text-xs mt-2 flex items-center gap-1">
              <Award size={12} className="text-[var(--color-accent)]" /> {ceo.experienceYears}+ years in real estate
            </span>
          </div>
          <div className="flex-1">
            <p className="text-tertiary text-xs uppercase font-semibold mb-2">A word from our CEO</p>
            <blockquote className="flex gap-3 mb-4">
              <Quote size={22} className="text-[var(--color-accent)] shrink-0 mt-1" />
              <p className="text-lg md:text-xl leading-relaxed">“{ceo.quote}”</p>
            </blockquote>
            <div className="flex flex-wrap gap-3">
              <Link to="/team"><GlassButton>Meet the team</GlassButton></Link>
              <Link to="/about"><GlassButton variant="glass">About {company.name}</GlassButton></Link>
            </div>
          </div>
        </div>
      </GlassCard>
    </section>
  )
}
