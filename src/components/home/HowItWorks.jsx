import { CalendarCheck, KeyRound, Search, Send } from 'lucide-react'
import GlassCard from '../glass/GlassCard'

const steps = [
  { icon: Search, title: 'Search', desc: 'Browse verified listings by city, budget, and property type.' },
  { icon: CalendarCheck, title: 'Shortlist & Visit', desc: 'Save favorites, compare options, and schedule a site visit.' },
  { icon: Send, title: 'Connect', desc: 'Talk directly with a verified agent for pricing and paperwork.' },
  { icon: KeyRound, title: 'Move In', desc: 'Complete the deal and get the keys to your new place.' },
]

export default function HowItWorks() {
  return (
    <section className="mb-16" aria-labelledby="how-it-works-heading">
      <div className="text-center mb-8">
        <h2 id="how-it-works-heading" className="text-2xl md:text-3xl font-bold mb-2">
          How It Works
        </h2>
        <p className="text-secondary">From search to move-in, in four simple steps.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {steps.map((s, i) => (
          <GlassCard key={s.title} className="p-6 relative">
            <span className="absolute top-4 right-5 text-3xl font-bold text-tertiary/30">{i + 1}</span>
            <div className="w-11 h-11 rounded-full glass-weak flex items-center justify-center mb-4">
              <s.icon className="text-[var(--color-accent)]" size={20} />
            </div>
            <h3 className="font-semibold mb-1.5">{s.title}</h3>
            <p className="text-secondary text-sm leading-relaxed">{s.desc}</p>
          </GlassCard>
        ))}
      </div>
    </section>
  )
}
