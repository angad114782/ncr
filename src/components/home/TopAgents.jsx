import { Link, useNavigate } from 'react-router-dom'
import { Award, MapPin, Star } from 'lucide-react'
import GlassCard from '../glass/GlassCard'
import GlassButton from '../glass/GlassButton'
import { useData } from '../../context/DataContext'

export default function TopAgents() {
  const { approvedAgents: agents } = useData()
  const navigate = useNavigate()
  const top = [...agents].sort((a, b) => b.rating - a.rating).slice(0, 4)

  if (top.length === 0) return null

  return (
    <section className="mb-16" aria-labelledby="top-agents-heading">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 id="top-agents-heading" className="text-2xl md:text-3xl font-bold">Top Rated Agents</h2>
          <p className="text-secondary text-sm mt-1">Verified experts ready to help you find the right property.</p>
        </div>
        <GlassButton variant="glass" size="sm" onClick={() => navigate('/agents')}>
          View All
        </GlassButton>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {top.map((agent) => (
          <Link key={agent.id} to={`/agents/${agent.id}`}>
            <GlassCard className="p-6 text-center h-full">
              <img
                src={agent.avatar}
                alt={`${agent.name}, ${agent.role}`}
                className="w-16 h-16 rounded-full object-cover mx-auto mb-3 ring-2 ring-[var(--glass-border)]"
                loading="lazy"
              />
              <h3 className="font-semibold text-sm">{agent.name}</h3>
              <p className="text-secondary text-xs mb-3">{agent.role}</p>
              <div className="flex items-center justify-center gap-3 text-xs text-secondary">
                <span className="flex items-center gap-1"><MapPin size={12} /> {agent.city}</span>
                <span className="flex items-center gap-1"><Star size={12} className="fill-[var(--color-warning)] text-[var(--color-warning)]" /> {agent.rating}</span>
              </div>
              <div className="glass-weak rounded-full px-3 py-1.5 text-xs mt-4 flex items-center justify-center gap-1">
                <Award size={12} /> {agent.dealsClosed} deals closed
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </section>
  )
}
