import { Link } from 'react-router-dom'
import { Award, MapPin, Star } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import { useData } from '../../context/DataContext'

export default function Agents() {
  const { approvedAgents: agents } = useData()

  return (
    <div className="pb-16">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Meet Our Agents</h1>
        <p className="text-secondary">Trusted local experts across India's top cities.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {agents.map((agent) => (
          <Link key={agent.id} to={`/agents/${agent.id}`}>
            <GlassCard className="p-6 text-center h-full">
              <img
                src={agent.avatar}
                alt={agent.name}
                className="w-20 h-20 rounded-full object-cover mx-auto mb-3 ring-2 ring-[var(--glass-border)]"
              />
              <h3 className="font-semibold">{agent.name}</h3>
              <p className="text-secondary text-sm mb-3">{agent.role}</p>
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
    </div>
  )
}
