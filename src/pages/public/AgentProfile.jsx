import { Link, useNavigate, useParams } from 'react-router-dom'
import { Award, Mail, MapPin, Phone, Star } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import PropertyCard from '../../components/property/PropertyCard'
import Seo from '../../components/layout/Seo'
import { useData } from '../../context/DataContext'
import { SITE_URL, breadcrumbLd } from '../../utils/seo'
import Avatar from '../../components/common/Avatar'

export default function AgentProfile() {
  const { id } = useParams()
  const { approvedAgents, activeProperties: properties } = useData()
  const navigate = useNavigate()

  // Only approved agents get a public profile — pending / rejected ones 404.
  const agent = approvedAgents.find((a) => a.id === id)
  if (!agent) {
    return (
      <GlassCard hover={false} className="p-12 text-center my-12">
        <Seo title="Agent Not Found" path={`/agents/${id}`} noindex />
        <p className="text-secondary mb-4">Agent not found.</p>
        <GlassButton onClick={() => navigate('/agents')}>Back to Agents</GlassButton>
      </GlassCard>
    )
  }

  const listings = properties.filter((p) => p.agentId === agent.id)

  return (
    <div className="pb-16">
      <Seo
        title={`${agent.name} — ${agent.role} in ${agent.city}`}
        description={`${agent.name} is a ${agent.role.toLowerCase()} in ${agent.city} on NCR Estates. ${agent.dealsClosed > 0 ? `${agent.dealsClosed} deals closed` : 'Approved by our team'}${agent.rating > 0 ? `, rated ${agent.rating}/5` : ''}. View active listings and contact directly.`}
        path={`/agents/${agent.id}`}
        image={agent.avatar}
        jsonLd={[
          breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Agents', path: '/agents' }, { name: agent.name, path: `/agents/${agent.id}` }]),
          {
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: agent.name,
            jobTitle: agent.role,
            url: `${SITE_URL}/agents/${agent.id}`,
            image: agent.avatar,
            description: agent.bio,
            workLocation: { '@type': 'City', name: agent.city },
            worksFor: { '@type': 'Organization', name: 'NCR Estates', url: SITE_URL },
          },
        ]}
      />
      <div className="text-sm text-secondary mb-4">
        <Link to="/agents" className="hover:text-primary">Agents</Link> / <span className="text-primary">{agent.name}</span>
      </div>

      <GlassCard hover={false} className="p-8 mb-8 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
        <Avatar src={agent.avatar} name={agent.name} alt={agent.name} className="w-28 h-28 rounded-full object-cover ring-4 ring-[var(--glass-border)]" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{agent.name}</h1>
          <p className="text-secondary mb-3">{agent.role}</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-3 text-sm text-secondary mb-4">
            <span className="flex items-center gap-1"><MapPin size={14} /> {agent.city}</span>
            {agent.rating > 0 && <span className="flex items-center gap-1"><Star size={14} className="fill-[var(--color-warning)] text-[var(--color-warning)]" /> {agent.rating} Rating</span>}
            {agent.dealsClosed > 0 && <span className="flex items-center gap-1"><Award size={14} /> {agent.dealsClosed} Deals Closed</span>}
          </div>
          <p className="text-secondary leading-relaxed max-w-xl">{agent.bio}</p>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-56 shrink-0">
          <a href={`tel:${agent.phone}`}>
            <GlassButton variant="glass" className="w-full justify-center"><Phone size={16} /> Call</GlassButton>
          </a>
          <a href={`mailto:${agent.email}`}>
            <GlassButton className="w-full justify-center"><Mail size={16} /> Email</GlassButton>
          </a>
        </div>
      </GlassCard>

      <h2 className="text-2xl font-bold mb-6">Listings by {agent.name}</h2>
      {listings.length === 0 ? (
        <p className="text-secondary">No active listings right now.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map((p) => <PropertyCard key={p.id} property={p} />)}
        </div>
      )}
    </div>
  )
}
