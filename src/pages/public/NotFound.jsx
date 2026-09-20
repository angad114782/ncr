import { Link } from 'react-router-dom'
import { Building2, Home } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import Seo from '../../components/layout/Seo'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center py-24">
      <Seo title="Page Not Found" description="The page you are looking for does not exist." path="/404" noindex />
      <GlassCard hover={false} strong className="p-12 text-center max-w-md">
        <span className="w-16 h-16 rounded-[18px] bg-[var(--color-accent)] flex items-center justify-center text-white mx-auto mb-5">
          <Building2 size={28} />
        </span>
        <h1 className="text-5xl font-bold mb-2">404</h1>
        <p className="text-secondary mb-6">This page doesn't exist — maybe the property was removed or the link is broken.</p>
        <Link to="/">
          <GlassButton className="justify-center w-full">
            <Home size={16} /> Back to Home
          </GlassButton>
        </Link>
      </GlassCard>
    </div>
  )
}
