import { Mail, Phone } from 'lucide-react'
import { useIsoLayoutEffect } from '../../hooks/usePersistedState'
import { useSettings } from '../../context/SettingsContext'

const STRIP_HEIGHT = '32px'

/**
 * A slim, permanent contact strip above the site's top banner/navbar — not a promo, never dismissible.
 * Google Business Profile checks that the phone number it has on file is actually visible on the website
 * (NAP consistency) during verification; this is the one place site-wide, so it's never missed. Lives outside
 * the main Navbar pill on purpose — cramming it in there alongside the logo, menu, Add Listing and Sign In
 * broke on medium/large widths.
 *
 * Sets `--contact-h` the same way TopBanner sets `--banner-h`; both are additive in Navbar.jsx and
 * PublicLayout.jsx's `paddingTop` so the stack (this → TopBanner → Navbar → page) never overlaps.
 */
export default function ContactStrip() {
  const { whatsappConfig, mailConfig } = useSettings()
  const digits = whatsappConfig.displayPhone
  const email = mailConfig.fromEmail

  useIsoLayoutEffect(() => {
    document.documentElement.style.setProperty('--contact-h', digits ? STRIP_HEIGHT : '0px')
  }, [digits])

  // Nothing to show yet (Display Phone Number not set in Admin → Settings → WhatsApp) — never render a blank strip.
  if (!digits) return null

  return (
    <div
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-4 px-4 text-xs font-medium text-secondary bg-[var(--bg-base-2)] border-b border-[var(--glass-border)]"
      style={{ height: STRIP_HEIGHT }}
    >
      <a href={`tel:+91${digits}`} className="flex items-center gap-1.5 hover:text-[var(--color-accent)] shrink-0">
        <Phone size={12} /> +91 {digits}
      </a>
      {email && (
        <a href={`mailto:${email}`} className="hidden sm:flex items-center gap-1.5 hover:text-[var(--color-accent)] truncate">
          <Mail size={12} /> {email}
        </a>
      )}
    </div>
  )
}
