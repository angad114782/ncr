import { Link } from 'react-router-dom'
import { Heart, MessageSquare, Search } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import PropertyCard from '../../components/property/PropertyCard'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'

export default function DashboardHome() {
  const { user } = useAuth()
  const { properties, savedIds, inquiries } = useData()

  const savedProperties = properties.filter((p) => savedIds.includes(p.id))
  const myInquiries = inquiries.filter((i) => i.userId === user?.id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-secondary">Here's what's happening with your property search.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <GlassCard hover={false} className="p-5">
          <Heart className="text-[var(--color-danger)] mb-2" size={22} />
          <p className="text-2xl font-bold">{savedProperties.length}</p>
          <p className="text-secondary text-sm">Saved Properties</p>
        </GlassCard>
        <GlassCard hover={false} className="p-5">
          <MessageSquare className="text-[var(--color-accent)] mb-2" size={22} />
          <p className="text-2xl font-bold">{myInquiries.length}</p>
          <p className="text-secondary text-sm">Inquiries Sent</p>
        </GlassCard>
        <Link to="/listings">
          <GlassCard className="p-5 h-full flex flex-col justify-center items-center text-center">
            <Search className="text-[var(--color-accent)] mb-2" size={22} />
            <p className="font-semibold">Browse Listings</p>
          </GlassCard>
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Saved Properties</h2>
          {savedProperties.length > 0 && (
            <GlassButton variant="glass" size="sm" as={Link} to="/dashboard/saved">View All</GlassButton>
          )}
        </div>
        {savedProperties.length === 0 ? (
          <GlassCard hover={false} className="p-8 text-center text-secondary">
            You haven't saved any properties yet. <Link to="/listings" className="text-[var(--color-accent)] font-medium">Start browsing</Link>
          </GlassCard>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {savedProperties.slice(0, 3).map((p) => <PropertyCard key={p.id} property={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}
