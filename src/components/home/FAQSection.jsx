import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import GlassCard from '../glass/GlassCard'
import { useData } from '../../context/DataContext'
import { faqLd } from '../../utils/seo'

/**
 * FAQ accordion fed by Admin → FAQs. `page` picks the FAQs ticked for that page
 * (home / about / contact); hidden (inactive) FAQs are never shown. Renders nothing
 * when there are none, and adds FAQPage structured data for Google.
 */
export default function FAQSection({
  page = 'home',
  title = 'Frequently Asked Questions',
  subtitle = 'Everything you need to know before you get started.',
  className = 'mb-16 max-w-3xl mx-auto',
}) {
  const { activeFaqs } = useData()
  const faqs = activeFaqs.filter((f) => (f.pages ?? []).includes(page))
  const [openId, setOpenId] = useState(null)

  if (faqs.length === 0) return null
  const current = openId ?? faqs[0].id

  return (
    <section className={className} aria-labelledby={`faq-heading-${page}`}>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqLd(faqs))}</script>
      </Helmet>
      <div className="text-center mb-8">
        <h2 id={`faq-heading-${page}`} className="text-2xl md:text-3xl font-bold mb-2">{title}</h2>
        {subtitle && <p className="text-secondary">{subtitle}</p>}
      </div>
      <div className="flex flex-col gap-3">
        {faqs.map((f) => {
          const open = current === f.id
          return (
            <GlassCard key={f.id} hover={false} className="overflow-hidden">
              <button
                onClick={() => setOpenId(open ? '' : f.id)}
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-4 p-5 text-left"
              >
                <span className="font-medium">{f.question}</span>
                <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
                  <ChevronDown size={18} className="text-secondary shrink-0" />
                </motion.span>
              </button>
              <motion.div
                initial={false}
                animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <p className="text-secondary text-sm px-5 pb-5 leading-relaxed">{f.answer}</p>
              </motion.div>
            </GlassCard>
          )
        })}
      </div>
    </section>
  )
}
