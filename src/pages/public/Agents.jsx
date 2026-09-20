import { Link } from 'react-router-dom'
import { Award, MapPin, Star } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import Seo from '../../components/layout/Seo'
import { useData } from '../../context/DataContext'
import { COMPANY } from '../../data/company'
import { breadcrumbLd } from '../../utils/seo'

export default function Agents() {
  const { approvedAgents: agents } = useData()

  return (
    <div className="pb-16">
      <Seo
        title="Property Agents & Consultants Across India"
        description="Meet approved property consultants and real estate agents who help you buy, rent and sell across Mumbai, Delhi, Bangalore, Pune, Hyderabad, Chennai and Gurugram."
        path="/agents"
        jsonLd={breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Agents', path: '/agents' }])}
      />
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Meet Our Agents</h1>
        <p className="text-secondary max-w-2xl mx-auto">
          Property consultants approved by the {COMPANY.name} team — local experts who help you buy, rent and sell across
          India's top cities. Every consultant on this page has been reviewed by our admin team before being listed.
        </p>
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

      <section className="mt-14 max-w-3xl mx-auto" aria-labelledby="choose-agent-heading">
        <h2 id="choose-agent-heading" className="text-2xl font-bold mb-3">How to choose the right property agent</h2>
        <p className="text-secondary leading-relaxed mb-3">
          A good agent saves you time and helps you avoid costly mistakes. Look for someone who is registered under RERA
          in their state, explains their fees up front, shares documents without hesitation, and shows you options that
          match your budget rather than the most expensive ones.
        </p>
        <p className="text-secondary leading-relaxed">
          Not sure where to start? Read our guide on{' '}
          <Link to="/blog/how-to-choose-property-dealer-delhi-ncr" className="text-[var(--color-accent)] font-medium">how to choose a trusted property dealer</Link>
          , learn{' '}
          <Link to="/blog/how-to-check-rera-registration" className="text-[var(--color-accent)] font-medium">how to check RERA registration</Link>
          , or <Link to="/contact" className="text-[var(--color-accent)] font-medium">talk to our team</Link> and we will match you with the right consultant.
        </p>
      </section>
    </div>
  )
}
