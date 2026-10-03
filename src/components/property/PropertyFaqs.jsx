import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import GlassCard from '../glass/GlassCard'

/** The listing's own questions & answers (set per listing in the admin / agent editor). Renders nothing when there are none. */
export default function PropertyFaqs({ faqs = [] }) {
  const [open, setOpen] = useState(0)
  if (faqs.length === 0) return null
  return (
    <GlassCard hover={false} className="p-6">
      <h3 className="font-semibold mb-4">Frequently Asked Questions</h3>
      <div className="flex flex-col gap-2">
        {faqs.map((f, i) => {
          const isOpen = open === i
          return (
            <div key={i} className="glass-weak rounded-[16px] overflow-hidden">
              <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen} className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left">
                <span className="font-medium text-[15px]">{f.question}</span>
                <ChevronDown size={18} className={`text-secondary shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && <p className="text-secondary text-sm px-4 pb-4 leading-relaxed whitespace-pre-line">{f.answer}</p>}
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}
