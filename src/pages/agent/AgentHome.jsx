import { Link } from 'react-router-dom'
import { Building2, CheckCircle2, Clock, MessageSquare, Plus, XCircle } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import AgentStatusBanner from './AgentStatusBanner'
import { reviewOf } from '../../components/admin/listingForm'
import { useSettings } from '../../context/SettingsContext'
import { useMyAgent } from './useMyAgent'

export default function AgentHome() {
  const { user, agent, status, properties, leads } = useMyAgent()
  const { siteContent, fill } = useSettings()

  const live = properties.filter((p) => reviewOf(p) === 'approved' && p.active !== false)
  const pending = properties.filter((p) => reviewOf(p) === 'pending')
  const rejected = properties.filter((p) => reviewOf(p) === 'rejected')
  const newLeads = leads.filter((l) => l.status === 'Pending')

  const stats = [
    { label: 'Live listings', value: live.length, icon: CheckCircle2, tone: 'text-[var(--color-success)]' },
    { label: 'Waiting for review', value: pending.length, icon: Clock, tone: 'text-[var(--color-warning)]' },
    { label: 'Need changes', value: rejected.length, icon: XCircle, tone: 'text-[var(--color-danger)]' },
    { label: 'New enquiries', value: newLeads.length, icon: MessageSquare, tone: 'text-[var(--color-accent)]' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Hello, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-secondary">Post your properties and follow the enquiries they bring.</p>
        </div>
        {status !== 'rejected' && (
          <GlassButton as={Link} to="/agent/listings" icon={Plus}>Post a property</GlassButton>
        )}
      </div>

      <AgentStatusBanner status={status} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <GlassCard key={s.label} hover={false} className="p-5">
            <s.icon className={`${s.tone} mb-2`} size={22} />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-secondary text-sm">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      <p className="text-tertiary text-sm -mt-2">{fill(siteContent.agentProgram.listingReviewNote)}</p>

      {rejected.length > 0 && (
        <GlassCard hover={false} className="p-5">
          <h2 className="font-semibold mb-3">Listings that need changes</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {rejected.map((p) => (
              <li key={p.id} className="glass-weak rounded-[14px] p-3">
                <p className="font-medium">{p.title}</p>
                <p className="text-secondary">{p.reviewNote || 'Please review the details and save the listing again to resubmit it.'}</p>
              </li>
            ))}
          </ul>
          <Link to="/agent/listings" className="text-[var(--color-accent)] text-sm font-medium mt-3 inline-block">Edit and resubmit →</Link>
        </GlassCard>
      )}

      <GlassCard hover={false} className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2"><MessageSquare size={16} /> Latest enquiries</h2>
          {leads.length > 0 && <Link to="/agent/leads" className="text-[var(--color-accent)] text-sm font-medium">View all →</Link>}
        </div>
        {leads.length === 0 ? (
          <p className="text-secondary text-sm">No enquiries yet. Once your listings are live, buyers and tenants can contact you from them.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {leads.slice(0, 4).map((l) => (
              <li key={l.id} className="glass-weak rounded-[14px] p-3 flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="font-medium block truncate">{l.userName}</span>
                  <span className="text-secondary block truncate">{properties.find((p) => p.id === l.propertyId)?.title}</span>
                </span>
                <span className="text-tertiary text-xs shrink-0">{l.date}</span>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      {!agent && <p className="text-tertiary text-sm flex items-center gap-2"><Building2 size={14} /> Setting up your agent profile…</p>}
    </div>
  )
}
