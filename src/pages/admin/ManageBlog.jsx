import { ExternalLink } from 'lucide-react'
import CollectionAdmin from '../../components/admin/CollectionAdmin'
import BlogBodyEditor from '../../components/admin/BlogBodyEditor'
import { useData } from '../../context/DataContext'
import { useSettings } from '../../context/SettingsContext'
import { blogCsv } from '../../utils/contentCsv'
import { slugify, formatDate } from '../../utils/blog'
import { newId } from '../../utils/ids'
import blogSeed from '../../data/blog.json'

const today = () => new Date().toISOString().slice(0, 10)

export default function ManageBlog() {
  const { blogPosts, blogCrud, restoreSeeds } = useData()
  const { company } = useSettings()

  const schema = (items) => [
    { key: 'title', label: 'Title', required: true, half: false, placeholder: 'e.g. How to check RERA registration', maxLength: 110 },
    { key: 'slug', label: 'URL slug', placeholder: 'auto-generated from the title', hint: 'Lower-case words with dashes. Becomes /blog/your-slug.' },
    { key: 'category', label: 'Category', placeholder: 'Buying Guides, Home Loans, Legal & RERA…' },
    { key: 'author', label: 'Author', placeholder: company.ceo.name },
    { key: 'date', label: 'Published on', type: 'date' },
    { key: 'cover', label: 'Cover image', type: 'image', hint: 'Shown on the blog list, the article header and in social / Google previews (links work best for previews).' },
    { key: 'description', label: 'Search description (SEO)', type: 'textarea', rows: 2, required: true, hint: 'One or two sentences, ideally 120–160 characters. Shown by Google under the title.' },
    { key: 'summary', label: 'Quick answer (AI & Google snippet)', type: 'textarea', rows: 2, hint: 'A direct 1–2 sentence answer to what the article is about (40–60 words is ideal). Shown in a “Quick answer” box at the top — AI assistants and Google AI Overviews quote this.' },
    { key: 'intro', label: 'Introduction', type: 'textarea', rows: 3, hint: 'Opening paragraph shown above the article.' },
    { key: 'body', type: 'custom', render: (p) => <BlogBodyEditor {...p} /> },
    {
      key: 'faqs',
      label: 'FAQs at the end of the article (optional)',
      type: 'objectList',
      addLabel: 'Add FAQ',
      itemTitle: (f, i) => f.question || `FAQ ${i + 1}`,
      newItem: () => ({ question: '', answer: '' }),
      fields: [
        { key: 'question', label: 'Question', half: false },
        { key: 'answer', label: 'Answer', type: 'textarea', rows: 3 },
      ],
    },
    {
      key: 'related',
      label: 'Related articles',
      type: 'multiselect',
      options: items.filter((p) => p.slug).map((p) => ({ value: p.slug, label: p.title.length > 44 ? `${p.title.slice(0, 44)}…` : p.title })),
    },
    { key: 'featured', label: 'Featured (shown first on the blog page)', type: 'toggle', half: true },
    { key: 'active', label: 'Published (visible on the website)', type: 'toggle', half: true },
  ]

  return (
    <CollectionAdmin
      title="Blog"
      singular="post"
      items={blogPosts}
      crud={blogCrud}
      schema={schema}
      csv={{ config: blogCsv, seedItems: blogSeed }}
      restore={() => restoreSeeds('blog')}
      activeLabels={{ on: 'Published', off: 'Draft' }}
      emptyItem={() => ({ id: newId('b'), slug: '', title: '', description: '', category: 'Buying Guides', author: company.ceo.name, date: today(), updated: today(), cover: '', summary: '', intro: '', body: '', media: {}, faqs: [], related: [], featured: false, active: false })}
      validate={(p, { items }) => {
        const slug = slugify(p.slug || p.title)
        if (!slug) return 'Please enter a title.'
        return items.some((x) => x.id !== p.id && x.slug === slug) ? `Another post already uses the URL “${slug}”. Change the slug.` : ''
      }}
      prepare={(p) => ({
        ...p,
        slug: slugify(p.slug || p.title),
        author: p.author?.trim() || company.ceo.name,
        date: p.date || today(),
        updated: today(), // any save counts as an update — shown as “Updated …” for E-E-A-T
        related: (p.related ?? []).filter((s) => s !== slugify(p.slug || p.title)),
        faqs: (p.faqs ?? []).filter((f) => f.question?.trim() && f.answer?.trim()),
      })}
      duplicate={(p) => ({ ...p, id: newId('b'), slug: `${p.slug}-copy`, title: `${p.title} (copy)`, active: false, featured: false })}
      searchText={(p) => `${p.title} ${p.slug} ${p.category} ${p.description}`}
      rowExtras={(p) => p.active !== false && (
        <a href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${p.title} on the website`} className="glass w-8 h-8 rounded-full flex items-center justify-center"><ExternalLink size={13} /></a>
      )}
      columns={[
        {
          label: 'Post',
          className: 'min-w-[280px]',
          render: (p) => (
            <div className="flex items-center gap-3">
              {p.cover ? <img src={p.cover} alt="" className="w-14 h-10 rounded-[10px] object-cover shrink-0" /> : <span className="w-14 h-10 rounded-[10px] glass-weak shrink-0" />}
              <div className="min-w-0">
                <p className="font-medium line-clamp-1">{p.title}{p.featured && <span className="ml-2 text-[10px] font-semibold uppercase text-[var(--color-accent)]">Featured</span>}</p>
                <p className="text-tertiary text-xs truncate">/blog/{p.slug}</p>
              </div>
            </div>
          ),
        },
        { label: 'Category', render: (p) => <span className="text-secondary">{p.category}</span> },
        { label: 'Published', render: (p) => <span className="text-secondary whitespace-nowrap">{formatDate(p.date)}</span> },
      ]}
    />
  )
}
