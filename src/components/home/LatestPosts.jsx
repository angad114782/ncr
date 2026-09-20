import { Link } from 'react-router-dom'
import GlassCard from '../glass/GlassCard'
import GlassButton from '../glass/GlassButton'
import Img from '../common/Img'
import { useData } from '../../context/DataContext'
import { formatDate, readingMinutes } from '../../utils/blog'

export default function LatestPosts() {
  const { activeBlogPosts } = useData()
  const posts = activeBlogPosts.slice(0, 3)
  if (posts.length === 0) return null

  return (
    <section className="mb-16" aria-labelledby="latest-posts-heading">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 id="latest-posts-heading" className="text-2xl md:text-3xl font-bold">Buying Guides & Insights</h2>
          <p className="text-secondary text-sm mt-1">Practical advice on RERA, home loans, stamp duty and more.</p>
        </div>
        <Link to="/blog"><GlassButton variant="glass" size="sm">All Articles</GlassButton></Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {posts.map((post) => (
          <Link key={post.id} to={`/blog/${post.slug}`}>
            <GlassCard className="overflow-hidden h-full flex flex-col">
              {post.cover && <Img src={post.cover} alt={post.title} width={640} height={320} widths={[400, 640, 900]} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="w-full h-40 object-cover" />}
              <div className="p-5 flex flex-col flex-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)] mb-1.5">{post.category}</span>
                <h3 className="font-semibold mb-2">{post.title}</h3>
                <p className="text-tertiary text-xs mt-auto">{formatDate(post.date)} · {readingMinutes(post)} min read</p>
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </section>
  )
}
