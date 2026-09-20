import { Link } from 'react-router-dom'
import { autoLinkParts } from '../../utils/autoLink'
import { useAutoLinkRules } from '../../hooks/useAutoLinkRules'

export const AUTO_LINK_CLASS = 'text-[var(--color-accent)] font-medium underline underline-offset-2'

/** Renders text with its auto-link parts (see utils/autoLink.js). */
export function renderAutoLinked(text, rules, opts) {
  return autoLinkParts(text, rules, opts).map((part, i) =>
    part.to
      ? /^https?:/i.test(part.to)
        ? <a key={i} href={part.to} className={AUTO_LINK_CLASS} target="_blank" rel="noopener noreferrer">{part.text}</a>
        : <Link key={i} to={part.to} className={AUTO_LINK_CLASS}>{part.text}</Link>
      : <span key={i}>{part.text}</span>,
  )
}

/**
 * Plain text with dynamic internal links. Pass the page's shared `claims` Map and a unique `id` to
 * link each keyword only once across several pieces of text on the same page.
 */
export default function AutoLinkedText({ text, claims, id, currentPath }) {
  const rules = useAutoLinkRules()
  return renderAutoLinked(text, rules, { claims, id, currentPath })
}
