import { Link } from 'react-router-dom'
import { ArrowRight, Building2 } from 'lucide-react'
import GlassCard from '../glass/GlassCard'
import GlassButton from '../glass/GlassButton'
import { useSettings } from '../../context/SettingsContext'

export default function ListPropertyCta() {
  const { siteContent, fill } = useSettings()
  const { title, text, buttonLabel, link } = siteContent.cta

  const external = /^https?:\/\//.test(link)
  const linkProps = external
    ? { as: 'a', href: link, target: '_blank', rel: 'noopener noreferrer' }
    : { as: Link, to: link || '/contact' }

  return (
    <section className="mb-16">
      <GlassCard strong hover={false} className="p-8 md:p-12 text-center overflow-hidden relative">
        <Building2 className="mx-auto mb-4 text-[var(--color-accent)]" size={32} />
        <h2 className="text-2xl md:text-3xl font-bold mb-2">{fill(title)}</h2>
        <p className="text-secondary max-w-lg mx-auto mb-6">{fill(text)}</p>
        <GlassButton size="md" {...linkProps} className="mx-auto">
          {buttonLabel} <ArrowRight size={18} />
        </GlassButton>
      </GlassCard>
    </section>
  )
}
