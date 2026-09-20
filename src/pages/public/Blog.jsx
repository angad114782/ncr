import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import Seo from '../../components/layout/Seo'
import { allPosts, formatDate, readingMinutes } from '../../utils/blog'
import { COMPANY } from '../../data/company'
import { SITE_URL, breadcrumbLd } from '../../utils/seo'

const categories = ['All', ...new Set(allPosts.map((p) => p.category))]

export default function Blog() {
  const [category, setCategory] = useState('All')
  const posts = category === 'All' ? allPosts : allPosts.filter((p) => p.category === category)
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
            name: `${COMPANY.name} Property Blog`,
            url: `${SITE_URL}/blog`,
            blogPost: allPosts.map((p) => ({
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

      <div className="flex flex-wrap justify-center gap-2 mb-8">
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

      {featured && (
        <Link to={`/blog/${featured.slug}`} className="block mb-8">
          <GlassCard strong className="overflow-hidden grid md:grid-cols-2">
            <img src={featured.cover} alt={featured.title} className="w-full h-56 md:h-full object-cover" />
            <div className="p-6 md:p-10 flex flex-col justify-center">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)] mb-2">
                {featured.category}
              </span>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">{featured.title}</h2>
              <p className="text-secondary mb-4">{featured.description}</p>
              <PostMeta post={featured} />
            </div>
          </GlassCard>
        </Link>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {rest.map((post) => (
          <Link key={post.slug} to={`/blog/${post.slug}`}>
            <GlassCard className="overflow-hidden h-full flex flex-col">
              <img src={post.cover} alt={post.title} loading="lazy" className="w-full h-44 object-cover" />
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
      <span>By {COMPANY.ceo.name}</span>
      <span>{formatDate(post.date)}</span>
      <span className="flex items-center gap-1">
        <Clock size={12} /> {readingMinutes(post)} min read
      </span>
    </p>
  )
}
