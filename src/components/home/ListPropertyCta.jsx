import { useNavigate } from 'react-router-dom'
import { ArrowRight, Building2 } from 'lucide-react'
import GlassCard from '../glass/GlassCard'
import GlassButton from '../glass/GlassButton'
import { useSettings } from '../../context/SettingsContext'

export default function ListPropertyCta() {
  const navigate = useNavigate()
  const { siteContent, fill } = useSettings()
  const { title, text, buttonLabel, link } = siteContent.cta

  const go = () => (/^https?:\/\//.test(link) ? window.open(link, '_blank', 'noopener') : navigate(link || '/contact'))

  return (
    <section className="mb-16">
      <GlassCard strong hover={false} className="p-8 md:p-12 text-center overflow-hidden relative">
        <Building2 className="mx-auto mb-4 text-[var(--color-accent)]" size={32} />
        <h2 className="text-2xl md:text-3xl font-bold mb-2">{fill(title)}</h2>
        <p className="text-secondary max-w-lg mx-auto mb-6">{fill(text)}</p>
        <GlassButton size="md" onClick={go} className="mx-auto">
          {buttonLabel} <ArrowRight size={18} />
        </GlassButton>
      </GlassCard>
    </section>
  )
}
