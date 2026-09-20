import { Link } from 'react-router-dom'
import { ShieldCheck, User } from 'lucide-react'
import CollectionAdmin from '../../components/admin/CollectionAdmin'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'

const schema = [
  { key: 'name', label: 'Full name', required: true },
  { key: 'phone', label: 'Mobile number (10 digits)', required: true, maxLength: 10, placeholder: '98XXXXXXXX', hint: 'Users sign in with this number + OTP.' },
  { key: 'city', label: 'City' },
  { key: 'role', label: 'Role', type: 'select', options: ['user', 'admin'], hint: 'Admins can open this panel. At least one active admin must always remain.' },
  { key: 'active', label: 'Active (can sign in)', type: 'toggle' },
]

export default function ManageUsers() {
  const { allUsers, addUser, updateUserById, setUserActive, deleteUser, user } = useAuth()
  const { agents } = useData()
  const pending = agents.filter((a) => a.status === 'pending').length

  // Adapter: CollectionAdmin talks to a generic CRUD object; users live in AuthContext.
  const crud = {
    upsert: (u) => {
      const patch = { name: u.name.trim(), phone: u.phone, city: u.city, role: u.role, active: u.active !== false }
      if (allUsers.some((x) => x.id === u.id)) return updateUserById(u.id, patch)
      const res = addUser(patch)
      return res.ok ? { ok: true } : res
    },
    toggleActive: (id) => setUserActive(id, allUsers.find((u) => u.id === id)?.active === false),
    setActive: (ids, active) => ids.forEach((id) => setUserActive(id, active)),
    remove: (id) => deleteUser(id),
    removeMany: (ids) => ids.forEach((id) => deleteUser(id)),
  }

  return (
    <div className="flex flex-col gap-4">
      {pending > 0 && (
        <p className="glass-weak rounded-[16px] px-4 py-3 text-sm">
          {pending} agent{pending > 1 ? 's are' : ' is'} waiting for approval — <Link to="/admin/agents" className="text-[var(--color-accent)] font-medium">review in Agents →</Link>
        </p>
      )}
      <CollectionAdmin
        title="Users"
        singular="user"
        items={allUsers}
        crud={crud}
        schema={schema}
        emptyItem={() => ({ id: 'new', name: '', phone: '', city: '', role: 'user', active: true })}
        validate={(u, { items, isNew }) => {
          if (!/^\d{10}$/.test(u.phone)) return 'Enter a valid 10-digit mobile number.'
          return items.some((x) => x.phone === u.phone && (isNew || x.id !== u.id)) ? 'This number is already linked to another account.' : ''
        }}
        searchText={(u) => `${u.name} ${u.phone} ${u.city} ${u.role}`}
        itemLabel={(u) => u.name}
        columns={[
          {
            label: 'User',
            className: 'min-w-[200px]',
            render: (u) => (
              <div className="flex items-center gap-3">
                {u.avatar ? <img src={u.avatar} alt="" className="w-9 h-9 rounded-full object-cover" /> : <span className="w-9 h-9 rounded-full glass-weak" />}
                <span className="font-medium">{u.name}{u.id === user?.id && <span className="ml-2 text-xs text-tertiary">(you)</span>}</span>
              </div>
            ),
          },
          { label: 'Mobile', render: (u) => <span className="text-secondary whitespace-nowrap">+91 {u.phone}</span> },
          { label: 'City', render: (u) => <span className="text-secondary">{u.city || '—'}</span> },
          {
            label: 'Role',
            render: (u) => (
              <span className={`px-2.5 py-1 rounded-full text-xs flex items-center gap-1 w-fit ${u.role === 'admin' ? 'glass-strong text-[var(--color-accent)]' : 'glass-weak text-secondary'}`}>
                {u.role === 'admin' ? <ShieldCheck size={12} /> : <User size={12} />} {u.role}
              </span>
            ),
          },
        ]}
      />
      <p className="text-tertiary text-xs">Built-in accounts can be deactivated but not deleted. Deactivated users are signed out and can’t log in.</p>
    </div>
  )
}
