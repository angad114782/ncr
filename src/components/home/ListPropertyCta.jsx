import { useNavigate } from 'react-router-dom'
import { ArrowRight, Building2 } from 'lucide-react'
import GlassCard from '../glass/GlassCard'
import GlassButton from '../glass/GlassButton'

export default function ListPropertyCta() {
  const navigate = useNavigate()

  return (
    <section className="mb-16">
      <GlassCard strong hover={false} className="p-8 md:p-12 text-center overflow-hidden relative">
        <Building2 className="mx-auto mb-4 text-[var(--color-accent)]" size={32} />
        <h2 className="text-2xl md:text-3xl font-bold mb-2">Have a Property to Sell or Rent?</h2>
        <p className="text-secondary max-w-lg mx-auto mb-6">
          List it on NCR Estates and reach thousands of verified buyers and tenants across India.
        </p>
        <GlassButton size="md" onClick={() => navigate('/contact')} className="mx-auto">
          List My Property <ArrowRight size={18} />
        </GlassButton>
      </GlassCard>
    </section>
  )
}
