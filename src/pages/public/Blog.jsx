import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Search } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import Seo from '../../components/layout/Seo'
import { useData } from '../../context/DataContext'
import { useSettings } from '../../context/SettingsContext'
import Img from '../../components/common/Img'
import { formatDate, readingMinutes } from '../../utils/blog'
import { SITE_URL, breadcrumbLd } from '../../utils/seo'

export default function Blog() {
  const { activeBlogPosts } = useData()
  const { company } = useSettings()
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')

  const categories = ['All', ...new Set(activeBlogPosts.map((p) => p.category).filter(Boolean))]
  const q = query.trim().toLowerCase()
  const posts = activeBlogPosts
    .filter((p) => (category === 'All' || p.category === category) && (!q || `${p.title} ${p.description} ${p.category}`.toLowerCase().includes(q)))
    // Featured posts first, newest first within each group.
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || new Date(b.date || 0) - new Date(a.date || 0))
  const [featured, ...rest] = posts

  return (
    <div className="pb-16">
      <Seo
        title="Property Blog — Buying Guides, Home Loans, RERA & Legal"
        description="Practical guides for buying property in India: first-time home buyer steps, ready-to-move vs under-construction, RERA checks, home loans, stamp duty and documents."
        path="/blog"
        jsonLd={[
          breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }]),
          {
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: `${company.name} Property Blog`,
            url: `${SITE_URL}/blog`,
            blogPost: activeBlogPosts.map((p) => ({
              '@type': 'BlogPosting',
              headline: p.title,
              url: `${SITE_URL}/blog/${p.slug}`,
              datePublished: p.date,
            })),
          },
        ]}
      />

      <div className="text-center mb-10 max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-bold mb-3">Property Blog</h1>
        <p className="text-secondary text-base md:text-lg">
          Plain-language guides on buying, renting and financing property in India — written to help you decide with
          confidence.
        </p>
      </div>

      {activeBlogPosts.length > 0 && (
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="glass-weak rounded-full flex items-center gap-2 px-4 h-11 w-full max-w-md">
            <Search size={16} className="text-tertiary" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search articles…" aria-label="Search articles" className="bg-transparent outline-none w-full text-sm" />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-4 py-2 rounded-full text-sm font-medium spring ${
                  category === c ? 'glass-strong text-[var(--color-accent)]' : 'glass-weak text-secondary'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {posts.length === 0 && (
        <GlassCard hover={false} className="p-12 text-center text-secondary">
          {activeBlogPosts.length === 0 ? 'New articles are on the way — check back soon.' : 'No articles match your search.'}
        </GlassCard>
      )}

      {featured && (
        <Link to={`/blog/${featured.slug}`} className="block mb-8">
          <GlassCard strong className="overflow-hidden grid grid-cols-1 md:grid-cols-2">
            {featured.cover ? <Img src={featured.cover} alt={featured.title} priority width={1200} height={630} sizes="(min-width:768px) 50vw, 100vw" className="w-full h-56 md:h-full object-cover" /> : <div className="h-40 md:h-full glass-weak" />}
            <div className="p-6 md:p-10 flex flex-col justify-center">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)] mb-2">
                {featured.featured ? 'Featured · ' : ''}{featured.category}
              </span>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">{featured.title}</h2>
              <p className="text-secondary mb-4">{featured.description}</p>
              <PostMeta post={featured} />
            </div>
          </GlassCard>
        </Link>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {rest.map((post) => (
          <Link key={post.id} to={`/blog/${post.slug}`}>
            <GlassCard className="overflow-hidden h-full flex flex-col">
              {post.cover ? <Img src={post.cover} alt={post.title} width={640} height={352} widths={[400, 640, 900]} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="w-full h-44 object-cover" /> : <div className="h-24 glass-weak" />}
              <div className="p-5 flex flex-col flex-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)] mb-2">
                  {post.category}
                </span>
                <h2 className="font-semibold text-lg mb-2">{post.title}</h2>
                <p className="text-secondary text-sm mb-4 flex-1">{post.description}</p>
                <PostMeta post={post} />
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  )
}

function PostMeta({ post }) {
  return (
    <p className="text-tertiary text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
      {post.author && <span>By {post.author}</span>}
      <span>{formatDate(post.date)}</span>
      <span className="flex items-center gap-1">
        <Clock size={12} /> {readingMinutes(post)} min read
      </span>
    </p>
  )
}
