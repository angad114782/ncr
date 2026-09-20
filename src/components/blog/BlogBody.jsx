import { Link } from 'react-router-dom'
import { isSafeHref, parseBody, parseInline, slugifyText } from '../../utils/blogBody'
import { renderAutoLinked, AUTO_LINK_CLASS } from '../common/AutoLinkedText'
import { useAutoLinkRules } from '../../hooks/useAutoLinkRules'

function Inline({ text, link, id }) {
  return parseInline(text).map((seg, i) => {
    if (seg.t === 'bold') return <strong key={i} className="text-primary">{seg.v}</strong>
    if (seg.t === 'link') {
      if (!isSafeHref(seg.href)) return <span key={i}>{seg.v}</span>
      const cls = AUTO_LINK_CLASS
      return /^https?:|^mailto:|^tel:/i.test(seg.href)
        ? <a key={i} href={seg.href} target="_blank" rel="noopener noreferrer" className={cls}>{seg.v}</a>
        : <Link key={i} to={seg.href} className={cls}>{seg.v}</Link>
    }
    return link ? <span key={i}>{renderAutoLinked(seg.v, link.rules, { ...link, id: `${id}.${i}` })}</span> : <span key={i}>{seg.v}</span>
  })
}

/** Renders the blog markup (see utils/blogBody.js). `media` resolves media:key images. */
export default function BlogBody({ body, media = {}, currentPath = '', claims = new Map() }) {
  const blocks = parseBody(body)
  // Dynamic internal links: each keyword / city links once per article, never to the page itself.
  const link = { rules: useAutoLinkRules(), claims, currentPath }

  return blocks.map((b, i) => {
    switch (b.type) {
      case 'h2':
        return <h2 key={i} id={slugifyText(b.text)} className="text-2xl font-bold mt-10 mb-3 scroll-mt-28">{b.text}</h2>
      case 'h3':
        return <h3 key={i} className="text-xl font-semibold mt-6 mb-2">{b.text}</h3>
      case 'p':
        return <p key={i} className="text-secondary leading-relaxed mb-4"><Inline text={b.text} link={link} id={i} /></p>
      case 'ul':
      case 'ol': {
        const Tag = b.type
        return (
          <Tag key={i} className={`${b.type === 'ol' ? 'list-decimal' : 'list-disc'} pl-6 flex flex-col gap-2 text-secondary leading-relaxed mb-4`}>
            {b.items.map((item, j) => <li key={j}><Inline text={item} link={link} id={`${i}-${j}`} /></li>)}
          </Tag>
        )
      }
      case 'table':
        return (
          <div key={i} className="overflow-x-auto my-4">
            <table className="w-full text-sm glass rounded-[16px] overflow-hidden">
              <thead>
                <tr className="text-left border-b border-[var(--glass-border)]">
                  {b.head.map((h, j) => <th key={j} className="p-3 font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((row, r) => (
                  <tr key={r} className="border-b border-[var(--glass-border)] last:border-0">
                    {row.map((cell, c) => <td key={c} className={`p-3 ${c === 0 ? 'font-medium' : 'text-secondary'}`}><Inline text={cell} /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      case 'img': {
        const src = b.src.startsWith('media:') ? media[b.src.slice(6)] : b.src
        if (!src) return null
        return (
          <figure key={i} className="my-6">
            <img src={src} alt={b.alt} loading="lazy" className="w-full rounded-[20px] object-cover" />
            {b.alt && <figcaption className="text-tertiary text-xs mt-2 text-center">{b.alt}</figcaption>}
          </figure>
        )
      }
      case 'quote':
        return (
          <blockquote key={i} className="glass-weak rounded-[16px] p-4 mb-4 text-secondary italic border-l-4 border-[var(--color-accent)]">
            <Inline text={b.text} />
          </blockquote>
        )
      default:
        return null
    }
  })
}
