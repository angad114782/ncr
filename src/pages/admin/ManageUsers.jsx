import { Check, Clock, ShieldCheck, User, X } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'

const statusStyles = {
  approved: 'text-[var(--color-success)]',
  pending: 'text-[var(--color-warning)]',
  rejected: 'text-[var(--color-danger)]',
}

export default function ManageUsers() {
  const { agents, updateAgentStatus } = useData()
  const { allUsers } = useAuth()

  const pendingAgents = agents.filter((a) => a.status === 'pending')

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1">Manage Users</h1>
        <p className="text-secondary">Registered users, agent approvals, and platform agents.</p>
      </div>

      {pendingAgents.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Clock size={16} className="text-[var(--color-warning)]" /> Pending Agent Approvals
          </h2>
          <div className="flex flex-col gap-3">
            {pendingAgents.map((a) => (
              <GlassCard hover={false} key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <img src={a.avatar} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{a.name}</p>
                  <p className="text-secondary text-sm truncate">{a.role} · {a.city}</p>
                  <p className="text-tertiary text-xs truncate">{a.email} · {a.phone}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <GlassButton
                    variant="glass"
                    size="sm"
                    icon={X}
                    className="text-[var(--color-danger)]"
                    onClick={() => updateAgentStatus(a.id, 'rejected')}
                  >
                    Reject
                  </GlassButton>
                  <GlassButton size="sm" icon={Check} onClick={() => updateAgentStatus(a.id, 'approved')}>
                    Approve
                  </GlassButton>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-semibold mb-3">Users</h2>
        <GlassCard hover={false} className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-secondary border-b border-[var(--glass-border)]">
                  <th className="p-4">Name</th>
                  <th className="p-4">Mobile</th>
                  <th className="p-4">City</th>
                  <th className="p-4">Role</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((u) => (
                  <tr key={u.id} className="border-b border-[var(--glass-border)] last:border-0">
                    <td className="p-4 flex items-center gap-3">
                      <img src={u.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                      <span className="font-medium">{u.name}</span>
                    </td>
                    <td className="p-4 text-secondary">+91 {u.phone}</td>
                    <td className="p-4 text-secondary">{u.city}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs flex items-center gap-1 w-fit ${u.role === 'admin' ? 'glass-strong text-[var(--color-accent)]' : 'glass-weak text-secondary'}`}>
                        {u.role === 'admin' ? <ShieldCheck size={12} /> : <User size={12} />} {u.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      <div>
        <h2 className="font-semibold mb-3">Agents</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((a) => (
            <GlassCard hover={false} key={a.id} className="p-4 flex items-center gap-3">
              <img src={a.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{a.name}</p>
                <p className="text-secondary text-xs truncate">{a.city}</p>
                <span className={`text-xs font-medium capitalize ${statusStyles[a.status] ?? 'text-secondary'}`}>
                  {a.status ?? 'approved'}
                </span>
              </div>
              {a.status === 'approved' && (
                <button
                  onClick={() => updateAgentStatus(a.id, 'rejected')}
                  className="glass w-8 h-8 rounded-full flex items-center justify-center spring hover:scale-105 text-[var(--color-danger)] shrink-0"
                  aria-label="Disapprove agent"
                >
                  <X size={13} />
                </button>
              )}
              {a.status === 'rejected' && (
                <button
                  onClick={() => updateAgentStatus(a.id, 'approved')}
                  className="glass w-8 h-8 rounded-full flex items-center justify-center spring hover:scale-105 text-[var(--color-success)] shrink-0"
                  aria-label="Approve agent"
                >
                  <Check size={13} />
                </button>
              )}
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  )
}
