import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import GlassCard from '../glass/GlassCard'
import { useData } from '../../context/DataContext'

/** A few buying guides linked from listing pages — passes authority to the blog and helps buyers. */
export default function GuideLinks({ title = 'Buying guides before you decide', max = 3, className = '' }) {
  const { activeBlogPosts } = useData()
  const posts = activeBlogPosts.slice(0, max)
  if (posts.length === 0) return null

  return (
    <section className={className} aria-label={title}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
        <Link to="/blog" className="text-sm font-medium text-[var(--color-accent)] shrink-0">All guides →</Link>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {posts.map((p) => (
          <Link key={p.id} to={`/blog/${p.slug}`}>
            <GlassCard className="p-4 h-full">
              <span className="text-xs font-semibold uppercase text-[var(--color-accent)] flex items-center gap-1"><BookOpen size={12} /> {p.category}</span>
              <p className="font-semibold text-sm mt-1.5">{p.title}</p>
            </GlassCard>
          </Link>
        ))}
      </div>
    </section>
  )
}
