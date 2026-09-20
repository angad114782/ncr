import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import GlassCard from '../glass/GlassCard'
import faqs from '../../data/faqs.json'

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: { '@type': 'Answer', text: f.answer },
  })),
}

export default function FAQSection() {
  const [openId, setOpenId] = useState(faqs[0]?.id ?? null)

  return (
    <section className="mb-16 max-w-3xl mx-auto" aria-labelledby="faq-heading">
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>
      <div className="text-center mb-8">
        <h2 id="faq-heading" className="text-2xl md:text-3xl font-bold mb-2">Frequently Asked Questions</h2>
        <p className="text-secondary">Everything you need to know before you get started.</p>
      </div>
      <div className="flex flex-col gap-3">
        {faqs.map((f) => {
          const open = openId === f.id
          return (
            <GlassCard key={f.id} hover={false} className="overflow-hidden">
              <button
                onClick={() => setOpenId(open ? null : f.id)}
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
