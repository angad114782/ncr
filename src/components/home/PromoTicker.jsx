import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext'

// Seconds of scrolling per character of text, per speed setting (≈ px/sec at 14px type).
const SPEED_FACTOR = { slow: 0.28, normal: 0.18, fast: 0.1 }
const MIN_COPY_CHARS = 200 // repeat short message lists so one copy always outruns the viewport

function MessageItem({ message }) {
  const inner = <span className="whitespace-nowrap">{message.text}</span>
  const cls = 'inline-flex items-center hover:underline underline-offset-2'
  if (!message.link) return <span className="inline-flex items-center">{inner}</span>
  if (/^https?:\/\//.test(message.link)) {
    return <a href={message.link} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
  }
  return <Link to={message.link} className={cls}>{inner}</Link>
}

/**
 * Admin-managed running strip shown between the navbar and the hero. Pass
 * `config` to preview unsaved settings (Admin → Settings); otherwise it reads
 * the saved ticker settings. Pauses on mouse hover / keyboard focus / press-and-hold; with
 * reduced motion it runs at half speed instead of stopping (see index.css).
 */
export default function PromoTicker({ config, className = '' }) {
  const { ticker } = useSettings()
  const cfg = config ?? ticker
  const messages = (cfg.messages ?? []).filter((m) => m.text?.trim())

  if (!cfg.enabled || messages.length === 0) return null

  const chars = messages.reduce((n, m) => n + m.text.length + 6, 0)
  const repeat = Math.max(1, Math.ceil(MIN_COPY_CHARS / chars))
  const copy = Array.from({ length: repeat }, () => messages).flat()
  const seconds = Math.max(12, chars * repeat * (SPEED_FACTOR[cfg.speed] ?? SPEED_FACTOR.normal))

  const renderCopy = (hidden) => (
    <ul className="flex items-center shrink-0" aria-hidden={hidden || undefined}>
      {copy.map((m, i) => (
        <li key={i} className="flex items-center text-sm font-medium">
          <MessageItem message={m} />
          <Sparkles size={13} className="mx-6 text-[var(--color-accent)] shrink-0" aria-hidden="true" />
        </li>
      ))}
    </ul>
  )

  return (
    <div
      className={`ticker glass-strong rounded-full py-2.5 mb-5 overflow-hidden ${className}`}
      role="region"
      aria-label="Announcements"
      style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, #000 5%, #000 95%, transparent)', maskImage: 'linear-gradient(to right, transparent, #000 5%, #000 95%, transparent)' }}
    >
      <div className="ticker-track" style={{ '--ticker-duration': `${seconds}s` }}>
        {renderCopy(false)}
        {renderCopy(true)}
      </div>
    </div>
  )
}
