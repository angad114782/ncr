import { motion } from 'framer-motion'
import { useMatch } from 'react-router-dom'
import { MessageCircle, Phone, Send } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext'
import { useData } from '../../context/DataContext'
import { findByParam } from '../../utils/propertySlug'

export default function ContactRail({ showMobileBar = true }) {
  const { whatsappConfig, siteContent, fill, fireContactEvent } = useSettings()
  const { properties } = useData()
  // On a property page the bar talks about THAT project: the WhatsApp text names it, and an "Enquire" button
  // jumps to the lead form (which sits far down the page on a phone).
  const match = useMatch('/property/:id')
  const property = match ? findByParam(properties, match.params.id) : null
  const digits = whatsappConfig.displayPhone.replace(/\D/g, '')
  const PHONE = `+91 ${whatsappConfig.displayPhone}`
  const PHONE_HREF = `tel:+91${digits}`
  const waText = property
    ? fill(siteContent.contact.waProperty).replace(/\{property\}/g, property.title)
    : fill(siteContent.contact.waGeneral)
  const WHATSAPP_HREF = `https://wa.me/91${digits}?text=${encodeURIComponent(waText)}`
  const onContact = (channel) => fireContactEvent(channel, property ? { content_name: property.title, content_ids: [property.id] } : {})
  const goToForm = () => document.getElementById('enquire')?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  return (
    <>
      {/* Mobile: floating call + WhatsApp bar pinned to the bottom of the viewport */}
      {showMobileBar && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.5 }}
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-strong px-3 pt-3 flex gap-3"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <a
            href={PHONE_HREF}
            onClick={() => onContact('call')}
            aria-label={`Call ${PHONE}`}
            className="flex-1 flex items-center justify-center gap-2 rounded-full py-3 font-semibold text-white spring active:scale-95"
            style={{ background: 'var(--color-accent)' }}
          >
            <Phone size={18} /> Call
          </a>
          {property && (
            <button
              type="button"
              onClick={goToForm}
              className="flex-1 flex items-center justify-center gap-2 rounded-full py-3 font-semibold spring active:scale-95 glass border border-[var(--color-accent)] text-[var(--color-accent)]"
            >
              <Send size={17} /> Enquire
            </button>
          )}
          <a
            href={WHATSAPP_HREF}
            onClick={() => onContact('whatsapp')}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            className="flex-1 flex items-center justify-center gap-2 rounded-full py-3 font-semibold text-white spring active:scale-95"
            style={{ background: '#25D366' }}
          >
            <MessageCircle size={18} /> WhatsApp
          </a>
        </motion.div>
      )}

      {/* Desktop: fixed vertical rail, centered on the viewport */}
      <motion.div
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.5 }}
        className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-col gap-3"
      >
        <a
          href={PHONE_HREF}
          onClick={() => onContact('call')}
          aria-label={`Call ${PHONE}`}
          className="group relative w-14 h-14 rounded-full glass-strong flex items-center justify-center spring hover:scale-105 text-[var(--color-accent)]"
        >
          <Phone size={20} />
          <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap glass-strong px-3 py-1.5 rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Call Us
          </span>
        </a>
        <a
          href={WHATSAPP_HREF}
          onClick={() => onContact('whatsapp')}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="group relative w-14 h-14 rounded-full glass-strong flex items-center justify-center spring hover:scale-105"
          style={{ color: '#25D366' }}
        >
          <MessageCircle size={20} />
          <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap glass-strong px-3 py-1.5 rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-primary)]">
            WhatsApp
          </span>
        </a>
      </motion.div>
    </>
  )
}
