import GlassCard from '../glass/GlassCard'
import { useSettings } from '../../context/SettingsContext'
import { getIcon } from '../../utils/icons'

export default function HowItWorks() {
  const { siteContent, fill } = useSettings()
  const { title, subtitle, steps } = siteContent.how
  if (!steps?.length) return null

  return (
    <section className="mb-16" aria-labelledby="how-it-works-heading">
      <div className="text-center mb-8">
        <h2 id="how-it-works-heading" className="text-2xl md:text-3xl font-bold mb-2">{fill(title)}</h2>
        <p className="text-secondary">{fill(subtitle)}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {steps.map((s, i) => {
          const Icon = getIcon(s.icon)
          return (
            <GlassCard key={i} className="p-6 relative">
              <span className="absolute top-4 right-5 text-3xl font-bold text-tertiary/30">{i + 1}</span>
              <div className="w-11 h-11 rounded-full glass-weak flex items-center justify-center mb-4">
                <Icon className="text-[var(--color-accent)]" size={20} />
              </div>
              <h3 className="font-semibold mb-1.5">{s.title}</h3>
              <p className="text-secondary text-sm leading-relaxed">{fill(s.desc)}</p>
            </GlassCard>
          )
        })}
      </div>
    </section>
  )
}
