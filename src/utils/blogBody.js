// A tiny, safe markup for blog posts so the admin can write articles without
// HTML. Supported (one construct per block, blocks separated by blank lines):
//
//   ## Heading            → h2          ### Sub-heading → h3
//   - item / * item       → bulleted list   1. item → numbered list
//   | a | b |             → table (first row = header; the |---| row is optional)
//   ![alt](url)           → image  (url may be a link, or media:key for an uploaded image)
//   > text                → highlighted note
//   anything else         → paragraph.   Inline: **bold**, [text](url)
//
// Nothing is ever injected as raw HTML — the renderer builds React nodes.

export function parseBody(body = '') {
  const lines = String(body).replace(/\r\n?/g, '\n').split('\n')
  const blocks = []
  let i = 0

  const isSpecial = (l) => /^(#{2,3}\s|[-*]\s|\d+[.)]\s|\||!\[.*\]\(.*\)\s*$|>\s?)/.test(l)

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }

    let m
    if ((m = line.match(/^(#{2,3})\s+(.*)$/))) {
      blocks.push({ type: m[1].length === 2 ? 'h2' : 'h3', text: m[2].trim() })
      i++
    } else if (/^[-*]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^[-*]\s+/, '').trim())
      blocks.push({ type: 'ul', items })
    } else if (/^\d+[.)]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\d+[.)]\s+/, '').trim())
      blocks.push({ type: 'ol', items })
    } else if (line.trim().startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i++].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells)
      }
      if (rows.length) blocks.push({ type: 'table', head: rows[0], rows: rows.slice(1) })
    } else if ((m = line.match(/^!\[(.*?)\]\((.+?)\)\s*$/))) {
      blocks.push({ type: 'img', alt: m[1], src: m[2].trim() })
      i++
    } else if (/^>\s?/.test(line)) {
      const parts = []
      while (i < lines.length && /^>\s?/.test(lines[i])) parts.push(lines[i++].replace(/^>\s?/, ''))
      blocks.push({ type: 'quote', text: parts.join(' ').trim() })
    } else {
      const parts = []
      while (i < lines.length && lines[i].trim() && !isSpecial(lines[i])) parts.push(lines[i++].trim())
      if (parts.length === 0) { parts.push(line.trim()); i++ }
      blocks.push({ type: 'p', text: parts.join(' ') })
    }
  }
  return blocks
}

export const slugifyText = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

/** h2 headings → table of contents entries. */
export function extractHeadings(body) {
  return parseBody(body)
    .filter((b) => b.type === 'h2')
    .map((b) => ({ id: slugifyText(b.text), label: b.text }))
}

/** Plain text of a body (reading time, SEO length checks). */
export function bodyPlainText(body) {
  return parseBody(body)
    .map((b) => {
      if (b.type === 'ul' || b.type === 'ol') return b.items.join(' ')
      if (b.type === 'table') return [...b.head, ...b.rows.flat()].join(' ')
      if (b.type === 'img') return b.alt
      return b.text
    })
    .join(' ')
    .replace(/\*\*|\[|\]\(.*?\)/g, ' ')
}

/** Split inline text into segments: plain / bold / link. */
export function parseInline(text = '') {
  const out = []
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g
  let last = 0
  let m
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: 'text', v: text.slice(last, m.index) })
    const token = m[0]
    if (token.startsWith('**')) out.push({ t: 'bold', v: token.slice(2, -2) })
    else {
      const lm = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
      out.push({ t: 'link', v: lm[1], href: lm[2] })
    }
    last = m.index + token.length
  }
  if (last < text.length) out.push({ t: 'text', v: text.slice(last) })
  return out
}

/** Only allow links a browser can safely follow. */
export const isSafeHref = (href) => /^(https?:\/\/|\/|mailto:|tel:|#)/i.test(href)
