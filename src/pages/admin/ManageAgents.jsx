import { Check, Star } from 'lucide-react'
import CollectionAdmin from '../../components/admin/CollectionAdmin'
import { useData } from '../../context/DataContext'
import { useSettings } from '../../context/SettingsContext'
import { agentCsv } from '../../utils/contentCsv'
import { newId } from '../../utils/ids'
import agentsSeed from '../../data/agents.json'

const statusStyle = { approved: 'text-[var(--color-success)]', pending: 'text-[var(--color-warning)]', rejected: 'text-[var(--color-danger)]' }

export default function ManageAgents() {
  const { agents, agentCrud, restoreSeeds } = useData()
  const { cities } = useSettings()

  const schema = [
    { key: 'name', label: 'Full name', required: true },
    { key: 'role', label: 'Role / title', placeholder: 'Senior Property Consultant' },
    { key: 'city', label: 'City', type: 'select', options: cities, allowEmpty: true },
    { key: 'phone', label: 'Phone', placeholder: '+91 98XXX XXXXX' },
    { key: 'email', label: 'Email', placeholder: 'name@company.com' },
    { key: 'status', label: 'Approval status', type: 'select', options: ['approved', 'pending', 'rejected'], hint: 'Only approved + active agents appear on the website.' },
    { key: 'rating', label: 'Rating (0–5)', type: 'number', min: 0, step: 0.1 },
    { key: 'dealsClosed', label: 'Deals closed', type: 'number', min: 0, step: 1 },
    { key: 'avatar', label: 'Photo', type: 'image' },
    { key: 'bio', label: 'Bio', type: 'textarea', rows: 4 },
    { key: 'active', label: 'Active (visible on the website)', type: 'toggle' },
  ]

  return (
    <CollectionAdmin
      title="Agents"
      singular="agent"
      items={agents}
      crud={agentCrud}
      schema={schema}
      csv={{ config: agentCsv, seedItems: agentsSeed }}
      restore={() => restoreSeeds('agents')}
      emptyItem={() => ({ id: newId('a'), name: '', role: '', city: '', phone: '', email: '', avatar: '', rating: 4.5, dealsClosed: 0, status: 'approved', bio: '', active: true })}
      prepare={(a) => ({ ...a, rating: Number(a.rating) || 0, dealsClosed: Number(a.dealsClosed) || 0 })}
      validate={(a) => (a.email && !/^\S+@\S+\.\S+$/.test(a.email) ? 'Enter a valid email address.' : '')}
      duplicate={(a) => ({ ...a, id: newId('a'), name: `${a.name} (copy)`, active: false })}
      searchText={(a) => `${a.name} ${a.role} ${a.city} ${a.email} ${a.phone}`}
      itemLabel={(a) => a.name}
      rowExtras={(a) => a.status === 'pending' && (
        <button type="button" aria-label={`Approve ${a.name}`} onClick={() => agentCrud.patch(a.id, { status: 'approved' })} className="glass w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-success)]"><Check size={13} /></button>
      )}
      columns={[
        {
          label: 'Agent',
          className: 'min-w-[200px]',
          render: (a) => (
            <div className="flex items-center gap-3">
              {a.avatar ? <img src={a.avatar} alt="" className="w-10 h-10 rounded-full object-cover" /> : <span className="w-10 h-10 rounded-full glass-weak flex items-center justify-center text-xs font-bold text-[var(--color-accent)]">{(a.name || '?')[0]}</span>}
              <div><p className="font-medium">{a.name}</p><p className="text-tertiary text-xs">{a.role}</p></div>
            </div>
          ),
        },
        { label: 'City', render: (a) => <span className="text-secondary">{a.city || '—'}</span> },
        { label: 'Approval', render: (a) => <span className={`text-xs font-semibold capitalize ${statusStyle[a.status] ?? ''}`}>{a.status ?? 'approved'}</span> },
        { label: 'Rating', render: (a) => <span className="flex items-center gap-1"><Star size={13} className="fill-[var(--color-warning)] text-[var(--color-warning)]" /> {a.rating}</span> },
      ]}
    />
  )
}
