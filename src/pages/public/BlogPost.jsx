import { Link, useParams } from 'react-router-dom'
import { ArrowRight, CalendarClock, Clock, Sparkles } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import Seo from '../../components/layout/Seo'
import BlogBody from '../../components/blog/BlogBody'
import Img from '../../components/common/Img'
import AutoLinkedText from '../../components/common/AutoLinkedText'
import ExploreLinks from '../../components/common/ExploreLinks'
import CeoAvatar from '../../components/company/CeoAvatar'
import NotFound from './NotFound'
import { useData } from '../../context/DataContext'
import { useSettings } from '../../context/SettingsContext'
import { formatDate, readingMinutes, relatedPosts } from '../../utils/blog'
import { extractHeadings } from '../../utils/blogBody'
import { SITE_URL, breadcrumbLd, crawlableImage, faqLd, personLd } from '../../utils/seo'

export default function BlogPost() {
  const { slug } = useParams()
  const { activeBlogPosts } = useData()
  const { company } = useSettings()
  const post = activeBlogPosts.find((p) => p.slug === slug)
  if (!post) return <NotFound />

  // Hand-picked related guides first, topped up automatically from the same category / shared keywords
  // so every article always links to (and is linked from) others.
  const related = relatedPosts(post, activeBlogPosts, 3)
  const path = `/blog/${post.slug}`
  const claims = new Map() // keyword → the text that linked it (each keyword links once per page)
  const url = `${SITE_URL}/blog/${post.slug}`
  const toc = extractHeadings(post.body)
  const authorName = post.author || company.ceo.name
  const isCeo = authorName === company.ceo.name

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
      ...(post.summary ? { abstract: post.summary } : {}),
      // Tells voice assistants and answer engines which parts to read out / quote.
      speakable: { '@type': 'SpeakableSpecification', cssSelector: ['[data-speakable]'] },
      ...(crawlableImage(post.cover) ? { image: post.cover } : {}),
      datePublished: post.date,
      dateModified: post.updated || post.date,
      mainEntityOfPage: url,
      author: isCeo ? personLd(company) : { '@type': 'Person', name: authorName },
      publisher: { '@type': 'Organization', name: company.name, url: SITE_URL },
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
        modifiedTime={post.updated || post.date}
        jsonLd={jsonLd}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-secondary mb-4">
        <Link to="/" className="hover:text-primary">Home</Link> /{' '}
        <Link to="/blog" className="hover:text-primary">Blog</Link> /{' '}
        <span className="text-primary">{post.category}</span>
      </nav>

      <header className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">{post.category}</span>
        <h1 className="text-3xl md:text-4xl font-bold mt-2 mb-4 break-words">{post.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-secondary">
          <Link to="/team" className="flex items-center gap-2 hover:text-primary">
            {isCeo ? <CeoAvatar className="w-8 h-8 text-xs" /> : null}
            <span>
              By <span className="font-medium text-primary">{authorName}</span>{isCeo ? `, ${company.ceo.title}` : ''}
            </span>
          </Link>
          <span className="flex items-center gap-1"><CalendarClock size={14} /> Updated {formatDate(post.updated || post.date)}</span>
          <span className="flex items-center gap-1"><Clock size={14} /> {readingMinutes(post)} min read</span>
        </div>
      </header>

      {post.cover && <Img src={post.cover} alt={post.title} priority width={1200} height={630} sizes="(min-width:768px) 768px, 100vw" className="w-full h-56 md:h-80 object-cover rounded-[24px] mb-8" />}

      {post.summary && (
        <aside data-speakable aria-label="Quick answer" className="glass-strong rounded-[20px] p-5 mb-6 border-l-4 border-[var(--color-accent)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)] flex items-center gap-1.5 mb-1.5">
            <Sparkles size={13} /> Quick answer
          </p>
          <p className="leading-relaxed">
            <AutoLinkedText text={post.summary} claims={claims} id="summary" currentPath={path} />
          </p>
        </aside>
      )}

      {post.intro && (
        <p className="text-lg text-secondary leading-relaxed mb-8" {...(post.summary ? {} : { 'data-speakable': true })}>
          <AutoLinkedText text={post.intro} claims={claims} id="intro" currentPath={path} />
        </p>
      )}

      {toc.length > 2 && (
        <GlassCard hover={false} className="p-5 mb-8">
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

      <BlogBody body={post.body} media={post.media} currentPath={path} claims={claims} />

      {post.faqs?.length > 0 && (
        <section className="my-10">
          <h2 className="text-2xl font-bold mb-4">Frequently asked questions</h2>
          <div className="flex flex-col gap-3">
            {post.faqs.map((f) => (
              <GlassCard key={f.question} hover={false} className="p-5">
                <h3 className="font-semibold mb-1.5">{f.question}</h3>
                <p className="text-secondary text-sm leading-relaxed"><AutoLinkedText text={f.answer} claims={claims} id={`faq-${f.question}`} currentPath={path} /></p>
              </GlassCard>
            ))}
          </div>
        </section>
      )}

      {isCeo && (
        <GlassCard hover={false} strong className="p-6 md:p-8 mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <CeoAvatar className="w-16 h-16 text-xl" />
            <div className="flex-1">
              <p className="text-tertiary text-xs uppercase font-semibold">About the author</p>
              <p className="font-semibold text-lg">{company.ceo.name} — {company.ceo.title}, {company.name}</p>
              <p className="text-secondary text-sm leading-relaxed">
                {company.ceo.experienceYears}+ years of experience in real estate. {company.ceo.expertise.slice(0, 2).join(' and ')}.
              </p>
            </div>
            <Link to="/team"><GlassButton variant="glass" size="sm">Meet the team</GlassButton></Link>
          </div>
        </GlassCard>
      )}

      <p className="text-tertiary text-xs mb-10 leading-relaxed">
        This article is for general information only and is not legal, tax or financial advice. Rules, rates and
        charges vary by state and change over time — verify current details with the relevant authority or a qualified
        professional before you decide.
      </p>

      <GlassCard hover={false} className="p-6 md:p-8 text-center mb-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">Ready to start your property search?</h2>
        <p className="text-secondary mb-5">Browse verified listings or talk to our team for free guidance.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/buy"><GlassButton className="w-full justify-center">Browse Listings <ArrowRight size={16} /></GlassButton></Link>
          <Link to="/contact"><GlassButton variant="glass" className="w-full justify-center">Talk to an Expert</GlassButton></Link>
        </div>
      </GlassCard>

      <ExploreLinks text={`${post.title} ${post.summary ?? ''} ${post.intro ?? ''} ${post.body ?? ''}`} className="mb-12" />

      {related.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">Related guides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map((r) => (
              <Link key={r.id} to={`/blog/${r.slug}`}>
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
