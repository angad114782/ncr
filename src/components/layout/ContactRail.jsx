import { motion } from 'framer-motion'
import { MessageCircle, Phone } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext'

export default function ContactRail({ showMobileBar = true }) {
  const { whatsappConfig } = useSettings()
  const digits = whatsappConfig.displayPhone.replace(/\D/g, '')
  const PHONE = `+91 ${whatsappConfig.displayPhone}`
  const PHONE_HREF = `tel:+91${digits}`
  const WHATSAPP_HREF = `https://wa.me/91${digits}?text=${encodeURIComponent(
    "Hi! I'm interested in a property listed on NCR Estates."
  )}`

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
            aria-label={`Call ${PHONE}`}
            className="flex-1 flex items-center justify-center gap-2 rounded-full py-3 font-semibold text-white spring active:scale-95"
            style={{ background: 'var(--color-accent)' }}
          >
            <Phone size={18} /> Call
          </a>
          <a
            href={WHATSAPP_HREF}
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
