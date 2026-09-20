import { Link, useParams } from 'react-router-dom'
import { ArrowRight, CalendarClock, Clock } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import Seo from '../../components/layout/Seo'
import NotFound from './NotFound'
import { formatDate, getPost, readingMinutes, slugify } from '../../utils/blog'
import { COMPANY } from '../../data/company'
import { SITE_URL, breadcrumbLd, faqLd, personLd } from '../../utils/seo'

export default function BlogPost() {
  const { slug } = useParams()
  const post = getPost(slug)
  if (!post) return <NotFound />

  const related = (post.related ?? []).map(getPost).filter(Boolean)
  const url = `${SITE_URL}/blog/${post.slug}`
  const toc = post.sections.map((s) => ({ id: slugify(s.heading), label: s.heading }))

  const jsonLd = [
    breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: 'Blog', path: '/blog' },
      { name: post.title, path: `/blog/${post.slug}` },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      image: post.cover,
      datePublished: post.date,
      dateModified: post.updated,
      mainEntityOfPage: url,
      author: personLd(),
      publisher: { '@type': 'Organization', name: COMPANY.name, url: SITE_URL },
    },
    ...(post.faqs?.length ? [faqLd(post.faqs)] : []),
  ]

  return (
    <article className="pb-16 max-w-3xl mx-auto">
      <Seo
        title={post.title}
        description={post.description}
        path={`/blog/${post.slug}`}
        image={post.cover}
        type="article"
        publishedTime={post.date}
        modifiedTime={post.updated}
        jsonLd={jsonLd}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-secondary mb-4">
        <Link to="/" className="hover:text-primary">Home</Link> /{' '}
        <Link to="/blog" className="hover:text-primary">Blog</Link> /{' '}
        <span className="text-primary">{post.category}</span>
      </nav>

      <header className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">{post.category}</span>
        <h1 className="text-3xl md:text-4xl font-bold mt-2 mb-4">{post.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-secondary">
          <Link to="/team" className="flex items-center gap-2 hover:text-primary">
            <span className="w-8 h-8 rounded-full glass-strong flex items-center justify-center text-xs font-bold text-[var(--color-accent)]">
              {COMPANY.ceo.name.split(' ').map((w) => w[0]).join('')}
            </span>
            <span>
              By <span className="font-medium text-primary">{COMPANY.ceo.name}</span>, {COMPANY.ceo.title}
            </span>
          </Link>
          <span className="flex items-center gap-1"><CalendarClock size={14} /> Updated {formatDate(post.updated)}</span>
          <span className="flex items-center gap-1"><Clock size={14} /> {readingMinutes(post)} min read</span>
        </div>
      </header>

      <img src={post.cover} alt={post.title} className="w-full h-56 md:h-80 object-cover rounded-[24px] mb-8" />

      <p className="text-lg text-secondary leading-relaxed mb-8">{post.intro}</p>

      {toc.length > 2 && (
        <GlassCard hover={false} className="p-5 mb-10">
          <p className="font-semibold mb-2">In this guide</p>
          <ol className="list-decimal list-inside text-sm text-secondary flex flex-col gap-1">
            {toc.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className="hover:text-[var(--color-accent)]">{t.label.replace(/^\d+\.\s*/, '')}</a>
              </li>
            ))}
          </ol>
        </GlassCard>
      )}

      {post.sections.map((s) => {
        const ListTag = s.ordered ? 'ol' : 'ul'
        return (
          <section key={s.heading} id={slugify(s.heading)} className="mb-8 scroll-mt-28">
            <h2 className="text-2xl font-bold mb-3">{s.heading}</h2>
            {s.body?.map((para, i) => (
              <p key={i} className="text-secondary leading-relaxed mb-3">{para}</p>
            ))}
            {s.table && (
              <div className="overflow-x-auto my-4">
                <table className="w-full text-sm glass rounded-[16px] overflow-hidden">
                  <thead>
                    <tr className="text-left border-b border-[var(--glass-border)]">
                      {s.table.head.map((h) => <th key={h} className="p-3 font-semibold">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {s.table.rows.map((row) => (
                      <tr key={row[0]} className="border-b border-[var(--glass-border)] last:border-0">
                        {row.map((cell, i) => (
                          <td key={i} className={`p-3 ${i === 0 ? 'font-medium' : 'text-secondary'}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {s.list && (
              <ListTag className={`${s.ordered ? 'list-decimal' : 'list-disc'} pl-6 flex flex-col gap-2 text-secondary leading-relaxed`}>
                {s.list.map((item) => <li key={item}>{item}</li>)}
              </ListTag>
            )}
          </section>
        )
      })}

      {post.faqs?.length > 0 && (
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4">Frequently asked questions</h2>
          <div className="flex flex-col gap-3">
            {post.faqs.map((f) => (
              <GlassCard key={f.question} hover={false} className="p-5">
                <h3 className="font-semibold mb-1.5">{f.question}</h3>
                <p className="text-secondary text-sm leading-relaxed">{f.answer}</p>
              </GlassCard>
            ))}
          </div>
        </section>
      )}

      <GlassCard hover={false} strong className="p-6 md:p-8 mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <span className="w-16 h-16 rounded-full glass-strong flex items-center justify-center text-xl font-bold text-[var(--color-accent)] shrink-0">
            {COMPANY.ceo.name.split(' ').map((w) => w[0]).join('')}
          </span>
          <div className="flex-1">
            <p className="text-tertiary text-xs uppercase font-semibold">About the author</p>
            <p className="font-semibold text-lg">{COMPANY.ceo.name} — {COMPANY.ceo.title}, {COMPANY.name}</p>
            <p className="text-secondary text-sm leading-relaxed">
              {COMPANY.ceo.experienceYears}+ years of experience in real estate. {COMPANY.ceo.expertise.slice(0, 2).join(' and ')}.
            </p>
          </div>
          <Link to="/team"><GlassButton variant="glass" size="sm">Meet the team</GlassButton></Link>
        </div>
      </GlassCard>

      <p className="text-tertiary text-xs mb-10 leading-relaxed">
        This article is for general information only and is not legal, tax or financial advice. Rules, rates and
        charges vary by state and change over time — verify current details with the relevant authority or a qualified
        professional before you decide.
      </p>

      <GlassCard hover={false} className="p-6 md:p-8 text-center mb-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">Ready to start your property search?</h2>
        <p className="text-secondary mb-5">Browse verified listings or talk to our team for free guidance.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/listings"><GlassButton className="w-full justify-center">Browse Listings <ArrowRight size={16} /></GlassButton></Link>
          <Link to="/contact"><GlassButton variant="glass" className="w-full justify-center">Talk to an Expert</GlassButton></Link>
        </div>
      </GlassCard>

      {related.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">Related guides</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {related.map((r) => (
              <Link key={r.slug} to={`/blog/${r.slug}`}>
                <GlassCard className="p-4 h-full">
                  <span className="text-xs font-semibold uppercase text-[var(--color-accent)]">{r.category}</span>
                  <p className="font-semibold text-sm mt-1">{r.title}</p>
                </GlassCard>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
