import { Link, useOutletContext } from 'react-router-dom'
import { Briefcase, Check } from 'lucide-react'
import GlassCard from '../glass/GlassCard'
import GlassButton from '../glass/GlassButton'
import { panelPath, useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'

/** "Join as an agent" card — opens the sign-up sheet on the Agent option (text: Admin → Site Content → Agent program). */
export default function AgentRegisterCta({ className = '' }) {
  const { siteContent, fill } = useSettings()
  const { user } = useAuth()
  const outlet = useOutletContext()
  const cfg = siteContent.agentProgram
  if (cfg.enabled === false) return null

  return (
    <GlassCard hover={false} strong className={`p-8 md:p-10 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <span className="w-14 h-14 rounded-[18px] bg-[var(--color-accent)] flex items-center justify-center text-white shrink-0">
          <Briefcase size={26} />
        </span>
        <div className="flex-1">
          <h2 className="text-xl md:text-2xl font-bold mb-2">{fill(cfg.title)}</h2>
          <ul className="flex flex-col gap-1.5">
            {(cfg.benefits ?? []).map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-secondary">
                <Check size={15} className="text-[var(--color-success)] mt-0.5 shrink-0" /> {fill(b)}
              </li>
            ))}
          </ul>
        </div>
        {user?.role === 'agent' ? (
          <GlassButton as={Link} to={panelPath(user)}>Open agent panel</GlassButton>
        ) : outlet?.openAuth ? (
          // The one official agent door (same as "List My Property" and the navbar's "Add Listing"): agent-only
          // sign-up/login, no buyer option. A signed-in buyer or the admin gets a switch-account notice.
          <GlassButton onClick={() => outlet.openAuth('signup', 'list', 'agent')}>Register as an agent</GlassButton>
        ) : null}
      </div>
    </GlassCard>
  )
}
