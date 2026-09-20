import GlassCard from '../glass/GlassCard'
import { useSettings } from '../../context/SettingsContext'
import { getIcon } from '../../utils/icons'

export default function WhyChooseUs() {
  const { siteContent, fill } = useSettings()
  const { title, subtitle, items } = siteContent.why
  if (!items?.length) return null

  return (
    <section className="mb-16" aria-labelledby="why-choose-us-heading">
      <div className="text-center mb-8">
        <h2 id="why-choose-us-heading" className="text-2xl md:text-3xl font-bold mb-2">{fill(title)}</h2>
        <p className="text-secondary">{fill(subtitle)}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {items.map((f, i) => {
          const Icon = getIcon(f.icon)
          return (
            <GlassCard key={i} className="p-6">
              <div className="w-11 h-11 rounded-full glass-weak flex items-center justify-center mb-4">
                <Icon className="text-[var(--color-accent)]" size={20} />
              </div>
              <h3 className="font-semibold mb-1.5">{f.title}</h3>
              <p className="text-secondary text-sm leading-relaxed">{fill(f.desc)}</p>
            </GlassCard>
          )
        })}
      </div>
    </section>
  )
}
