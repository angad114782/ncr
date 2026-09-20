import { useRef, useState } from 'react'
import { Bold, Eye, EyeOff, Heading2, Heading3, ImagePlus, Link2, List, ListOrdered, Quote, Table2 } from 'lucide-react'
import GlassButton from '../glass/GlassButton'
import GlassInput from '../glass/GlassInput'
import { ImageField } from './ImageField'
import BlogBody from '../blog/BlogBody'
import { isDataUrl } from '../../utils/images'
import { readingMinutes } from '../../utils/blog'

const TABLE_TEMPLATE = '\n\n| Column A | Column B |\n| --- | --- |\n| Row 1 | Value |\n| Row 2 | Value |\n\n'

/**
 * Article body editor: a textarea with a formatting toolbar (no HTML needed), an
 * image inserter (upload from device or paste a link) and a live preview.
 * Markup reference lives in utils/blogBody.js.
 */
export default function BlogBodyEditor({ item, set, setItem }) {
  const ref = useRef(null)
  const [preview, setPreview] = useState(false)
  const [imgOpen, setImgOpen] = useState(false)
  const [img, setImg] = useState({ src: '', alt: '' })

  const body = item.body ?? ''

  const edit = (transform, { extra } = {}) => {
    const ta = ref.current
    const start = ta?.selectionStart ?? body.length
    const end = ta?.selectionEnd ?? body.length
    const { text, selStart, selEnd } = transform(body.slice(0, start), body.slice(start, end), body.slice(end))
    const nextBody = text
    if (extra) setItem({ ...item, ...extra, body: nextBody })
    else set(nextBody)
    requestAnimationFrame(() => {
      ref.current?.focus()
      ref.current?.setSelectionRange(selStart, selEnd)
    })
  }

  const wrap = (before, after = before, placeholder = 'text') =>
    edit((pre, sel, post) => {
      const inner = sel || placeholder
      return { text: `${pre}${before}${inner}${after}${post}`, selStart: pre.length + before.length, selEnd: pre.length + before.length + inner.length }
    })

  const prefixLines = (prefixFor) =>
    edit((pre, sel, post) => {
      const lineStart = pre.lastIndexOf('\n') + 1
      const head = pre.slice(0, lineStart)
      const block = pre.slice(lineStart) + sel
      const lines = (block || 'Item').split('\n').map((l, i) => `${prefixFor(i)}${l.replace(/^(#{2,3}\s|[-*]\s|\d+[.)]\s|>\s?)/, '')}`)
      const out = lines.join('\n')
      return { text: `${head}${out}${post}`, selStart: head.length, selEnd: head.length + out.length }
    })

  const insert = (snippet) =>
    edit((pre, sel, post) => ({ text: `${pre}${snippet}${post}`, selStart: pre.length + snippet.length, selEnd: pre.length + snippet.length }))

  const insertImage = () => {
    if (!img.src) return
    let src = img.src
    let extra
    if (isDataUrl(src)) {
      // Uploaded images live in the post's own media map so the body text stays short.
      const media = { ...(item.media ?? {}) }
      let n = Object.keys(media).length + 1
      while (media[`img${n}`]) n++
      media[`img${n}`] = src
      src = `media:img${n}`
      extra = { media }
    }
    const md = `\n\n![${img.alt.trim() || 'Image'}](${src})\n\n`
    edit((pre, sel, post) => ({ text: `${pre}${md}${post}`, selStart: pre.length + md.length, selEnd: pre.length + md.length }), { extra })
    setImg({ src: '', alt: '' })
    setImgOpen(false)
  }

  const tools = [
    { label: 'Heading', icon: Heading2, run: () => prefixLines(() => '## ') },
    { label: 'Sub-heading', icon: Heading3, run: () => prefixLines(() => '### ') },
    { label: 'Bold', icon: Bold, run: () => wrap('**') },
    { label: 'Bullet list', icon: List, run: () => prefixLines(() => '- ') },
    { label: 'Numbered list', icon: ListOrdered, run: () => prefixLines((i) => `${i + 1}. `) },
    { label: 'Link', icon: Link2, run: () => wrap('[', '](https://)', 'link text') },
    { label: 'Quote', icon: Quote, run: () => prefixLines(() => '> ') },
    { label: 'Table', icon: Table2, run: () => insert(TABLE_TEMPLATE) },
  ]

  const words = body.split(/\s+/).filter(Boolean).length

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-secondary px-1">Article body</span>
      <div className="glass-weak rounded-[16px] p-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {tools.map((t) => (
            <button key={t.label} type="button" title={t.label} aria-label={t.label} onClick={t.run} className="glass w-9 h-9 rounded-full flex items-center justify-center spring hover:scale-105">
              <t.icon size={15} />
            </button>
          ))}
          <button type="button" title="Insert image" aria-label="Insert image" onClick={() => setImgOpen((v) => !v)} className={`glass w-9 h-9 rounded-full flex items-center justify-center spring hover:scale-105 ${imgOpen ? 'text-[var(--color-accent)]' : ''}`}>
            <ImagePlus size={15} />
          </button>
          <div className="flex-1" />
          <span className="text-tertiary text-xs hidden sm:inline">{words} words · ~{readingMinutes({ ...item, faqs: [] })} min read</span>
          <button type="button" onClick={() => setPreview((v) => !v)} className="glass rounded-full px-3.5 h-9 text-sm font-medium flex items-center gap-1.5">
            {preview ? <><EyeOff size={14} /> Edit</> : <><Eye size={14} /> Preview</>}
          </button>
        </div>

        {imgOpen && (
          <div className="glass rounded-[16px] p-3 flex flex-col gap-3">
            <ImageField label="Image" value={img.src} onChange={(src) => setImg((s) => ({ ...s, src }))} hint="Choose a file from your device or paste a link." />
            <GlassInput label="Caption / alt text" placeholder="Describe the image" value={img.alt} onChange={(e) => setImg((s) => ({ ...s, alt: e.target.value }))} />
            <div><GlassButton type="button" size="sm" disabled={!img.src} onClick={insertImage}>Insert into article</GlassButton></div>
          </div>
        )}

        {preview ? (
          <div className="glass rounded-[16px] p-5 max-h-[420px] overflow-y-auto">
            {body.trim() ? <BlogBody body={body} media={item.media} /> : <p className="text-tertiary text-sm">Nothing to preview yet.</p>}
          </div>
        ) : (
          <textarea
            ref={ref}
            aria-label="Article body"
            value={body}
            onChange={(e) => set(e.target.value)}
            rows={16}
            spellCheck
            placeholder={'## First heading\n\nWrite a paragraph…\n\n- A bullet point\n- Another one'}
            className="glass rounded-[16px] p-4 w-full bg-transparent outline-none text-[15px] leading-relaxed font-mono resize-y min-h-[260px]"
          />
        )}

        <details className="text-xs text-secondary">
          <summary className="cursor-pointer font-medium">Formatting cheat-sheet</summary>
          <pre className="mt-2 whitespace-pre-wrap text-tertiary leading-relaxed">{`## Heading        ### Sub-heading
- bullet   1. numbered   > highlighted note
**bold**   [link text](https://…)
| Col A | Col B |     (table — first row is the header)
| --- | --- |
![caption](https://image-link)   (image)`}</pre>
        </details>
      </div>
    </div>
  )
}
