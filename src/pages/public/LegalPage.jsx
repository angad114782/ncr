import { Link } from 'react-router-dom'
import GlassCard from '../../components/glass/GlassCard'
import Seo from '../../components/layout/Seo'
import { useSettings } from '../../context/SettingsContext'
import { breadcrumbLd } from '../../utils/seo'
import { formatDate } from '../../utils/blog'

export const LEGAL_PAGES = [
  { kind: 'privacy', path: '/privacy', label: 'Privacy Policy' },
  { kind: 'terms', path: '/terms', label: 'Terms & Conditions' },
  { kind: 'disclaimer', path: '/disclaimer', label: 'Disclaimer' },
]

/** Blank line = paragraph, lines starting with "- " = bullet list. Nothing is ever rendered as raw HTML. */
function Body({ text }) {
  const blocks = String(text ?? '').replace(/\r\n?/g, '\n').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  return blocks.map((block, i) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    const bullets = lines.filter((l) => /^[-*]\s+/.test(l))
    if (bullets.length === lines.length) {
      return (
        <ul key={i} className="list-disc pl-5 flex flex-col gap-1.5">
          {lines.map((l) => <li key={l}>{l.replace(/^[-*]\s+/, '')}</li>)}
        </ul>
      )
    }
    // A paragraph that introduces a list: intro line(s), then bullets
    const firstBullet = lines.findIndex((l) => /^[-*]\s+/.test(l))
    if (firstBullet > 0) {
      return (
        <div key={i} className="flex flex-col gap-1.5">
          <p>{lines.slice(0, firstBullet).join(' ')}</p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            {lines.slice(firstBullet).map((l) => <li key={l}>{l.replace(/^[-*]\s+/, '')}</li>)}
          </ul>
        </div>
      )
    }
    return <p key={i}>{lines.join(' ')}</p>
  })
}

/**
 * Privacy Policy / Terms & Conditions / Disclaimer — the text lives in Admin → Site Content, so the
 * owner (or their lawyer) can change it without a developer. `kind` is privacy | terms | disclaimer.
 */
export default function LegalPage({ kind }) {
  const { siteContent, company, fill, whatsappConfig, mailConfig } = useSettings()
  const page = siteContent.legal?.[kind]
  const meta = LEGAL_PAGES.find((p) => p.kind === kind)
  if (!page || !meta) return null

  const text = (t) =>
    fill(t ?? '')
      .replace(/\{email\}/g, mailConfig.fromEmail)
      .replace(/\{phone\}/g, whatsappConfig.displayPhone)

  return (
    <div className="pb-16 max-w-3xl mx-auto">
      <Seo
        title={page.title}
        description={`${page.title} of ${company.name}: ${text(page.intro).slice(0, 120).replace(/\s+\S*$/, '')}…`}
        path={meta.path}
        jsonLd={breadcrumbLd([{ name: 'Home', path: '/' }, { name: page.title, path: meta.path }])}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-secondary mb-4">
        <Link to="/" className="hover:text-primary">Home</Link> / <span className="text-primary">{page.title}</span>
      </nav>
      <h1 className="text-3xl md:text-4xl font-bold mb-2">{page.title}</h1>
      {page.updated && <p className="text-tertiary text-sm mb-4">Last updated {formatDate(page.updated)}</p>}
      <p className="text-secondary mb-8 leading-relaxed">{text(page.intro)}</p>

      <div className="flex flex-col gap-5">
        {(page.sections ?? []).map((s, i) => (
          <GlassCard key={`${s.title}-${i}`} hover={false} className="p-6">
            <h2 className="text-xl font-bold mb-3">{i + 1}. {s.title}</h2>
            <div className="flex flex-col gap-3 text-secondary leading-relaxed text-sm">
              <Body text={text(s.body)} />
            </div>
          </GlassCard>
        ))}
      </div>

      <p className="text-tertiary text-sm mt-8 flex flex-wrap gap-x-4 gap-y-1">
        {LEGAL_PAGES.filter((p) => p.kind !== kind).map((p) => (
          <Link key={p.kind} to={p.path} className="hover:text-[var(--color-accent)] underline underline-offset-2">{siteContent.legal?.[p.kind]?.title ?? p.label}</Link>
        ))}
        <Link to="/contact" className="hover:text-[var(--color-accent)] underline underline-offset-2">Contact us</Link>
      </p>
    </div>
  )
}
