import { Star } from 'lucide-react'
import GlassCard from '../glass/GlassCard'
import testimonials from '../../data/testimonials.json'

export default function Testimonials() {
  return (
    <section className="mb-16">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">What Our Clients Say</h2>
        <p className="text-secondary">Real stories from buyers, renters, and investors across India.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        {testimonials.map((t) => (
          <GlassCard key={t.id} className="p-6">
            <div className="flex items-center gap-1 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={i < t.rating ? 'fill-[var(--color-warning)] text-[var(--color-warning)]' : 'text-tertiary'}
                />
              ))}
            </div>
            <p className="text-secondary text-sm leading-relaxed mb-4">"{t.text}"</p>
            <div className="flex items-center gap-3">
              <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
              <div>
                <p className="font-medium text-sm">{t.name}</p>
                <p className="text-tertiary text-xs">{t.city}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  )
}
