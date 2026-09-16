import { Building2, HeartHandshake, ShieldCheck, TrendingUp } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'

const values = [
  { icon: ShieldCheck, title: 'Verified Listings', desc: 'Every property is verified by our on-ground team before it goes live.' },
  { icon: HeartHandshake, title: 'Client First', desc: 'Transparent pricing and honest guidance through your entire journey.' },
  { icon: TrendingUp, title: 'Market Insight', desc: 'Data-backed pricing recommendations across every Indian metro.' },
]

export default function About() {
  return (
    <div className="pb-16">
      <GlassCard hover={false} strong className="p-10 md:p-16 text-center mb-12">
        <span className="w-16 h-16 rounded-[18px] bg-[var(--color-accent)] flex items-center justify-center text-white mx-auto mb-5">
          <Building2 size={28} />
        </span>
        <h1 className="text-3xl md:text-5xl font-bold mb-4">About NCR Estates</h1>
        <p className="text-secondary max-w-2xl mx-auto text-base md:text-lg">
          Since 2016, NCR Estates has helped thousands of families and businesses find the right
          property across India — from sea-facing apartments in Mumbai to tech-park offices in Bangalore.
        </p>
      </GlassCard>

      <div className="grid md:grid-cols-3 gap-5 mb-12">
        {values.map((v) => (
          <GlassCard key={v.title} className="p-6">
            <v.icon className="text-[var(--color-accent)] mb-3" size={28} />
            <h3 className="font-semibold text-lg mb-2">{v.title}</h3>
            <p className="text-secondary text-sm leading-relaxed">{v.desc}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard hover={false} className="p-8 md:p-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {[
          ['9+', 'Years of Experience'],
          ['12,000+', 'Happy Clients'],
          ['7', 'Cities Covered'],
          ['4.8/5', 'Average Rating'],
        ].map(([value, label]) => (
          <div key={label}>
            <p className="text-3xl font-bold text-[var(--color-accent)]">{value}</p>
            <p className="text-secondary text-sm mt-1">{label}</p>
          </div>
        ))}
      </GlassCard>
    </div>
  )
}
