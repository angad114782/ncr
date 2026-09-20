import { Clock, ShieldAlert } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext'

/** Tells the agent where they stand: waiting for approval, or not approved. Nothing when approved. */
export default function AgentStatusBanner({ status }) {
  const { siteContent, fill } = useSettings()
  const cfg = siteContent.agentProgram
  if (status === 'approved') return null
  const rejected = status === 'rejected'
  const Icon = rejected ? ShieldAlert : Clock
  return (
    <div role="status" className={`glass-strong rounded-[18px] p-4 mb-6 flex items-start gap-3 border ${rejected ? 'border-[var(--color-danger)]' : 'border-[var(--color-warning)]'}`}>
      <Icon size={20} className={`shrink-0 mt-0.5 ${rejected ? 'text-[var(--color-danger)]' : 'text-[var(--color-warning)]'}`} />
      <p className="text-sm leading-relaxed">{fill(rejected ? cfg.rejectedNotice : cfg.pendingNotice)}</p>
    </div>
  )
}
