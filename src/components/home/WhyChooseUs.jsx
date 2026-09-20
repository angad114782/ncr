import { BadgeCheck, HeadphonesIcon, ShieldCheck, Wallet } from 'lucide-react'
import GlassCard from '../glass/GlassCard'

const features = [
  {
    icon: BadgeCheck,
    title: 'Verified Listings',
    desc: 'The Verified badge appears only on listings our team has marked verified, and RERA numbers are shown where available.',
  },
  {
    icon: ShieldCheck,
    title: 'Trusted Agents',
    desc: 'Every consultant is approved by our admin team before appearing on the site — and led by a CEO with 5+ years in real estate.',
  },
  {
    icon: Wallet,
    title: 'Transparent Pricing',
    desc: 'No hidden charges. See the true price, EMI estimates, and fees upfront.',
  },
  {
    icon: HeadphonesIcon,
    title: 'Real People, Real Help',
    desc: 'Free help with site visits, budgeting and paperwork guidance — call, WhatsApp or send an enquiry any time.',
  },
]

export default function WhyChooseUs() {
  return (
    <section className="mb-16" aria-labelledby="why-choose-us-heading">
      <div className="text-center mb-8">
        <h2 id="why-choose-us-heading" className="text-2xl md:text-3xl font-bold mb-2">
          Why Choose NCR Estates
        </h2>
        <p className="text-secondary">A platform built on trust, transparency, and local expertise.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {features.map((f) => (
          <GlassCard key={f.title} className="p-6">
            <div className="w-11 h-11 rounded-full glass-weak flex items-center justify-center mb-4">
              <f.icon className="text-[var(--color-accent)]" size={20} />
            </div>
            <h3 className="font-semibold mb-1.5">{f.title}</h3>
            <p className="text-secondary text-sm leading-relaxed">{f.desc}</p>
          </GlassCard>
        ))}
      </div>
    </section>
  )
}
