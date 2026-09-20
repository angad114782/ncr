import { useState } from 'react'
import { Check } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassInput from '../../components/glass/GlassInput'
import GlassButton from '../../components/glass/GlassButton'
import { ImageField } from '../../components/admin/ImageField'
import Profile from '../dashboard/Profile'
import AgentStatusBanner from './AgentStatusBanner'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { useSettings } from '../../context/SettingsContext'
import { useMyAgent } from './useMyAgent'

/** Account details (name, city, number) plus the public agent profile visitors see. */
export default function AgentProfilePage() {
  const { agent, status } = useMyAgent()
  const { updateProfile } = useAuth()
  const { agentCrud } = useData()
  const { cities } = useSettings()

  return (
    <div className="flex flex-col gap-8">
      <AgentStatusBanner status={status} />
      <Profile />
      {agent && <PublicProfile key={agent.id} agent={agent} cities={cities} onSave={(patch) => { agentCrud.patch(agent.id, patch); updateProfile({ name: patch.name, city: patch.city }) }} />}
    </div>
  )
}

function PublicProfile({ agent, cities, onSave }) {
  const [form, setForm] = useState({
    name: agent.name ?? '', role: agent.role ?? '', city: agent.city ?? '', email: agent.email ?? '', avatar: agent.avatar ?? '',
    agency: agent.agency ?? '', reraId: agent.reraId ?? '', bio: agent.bio ?? '',
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    if (form.name.trim().length < 2) return setError('Please enter your name.')
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return setError('Enter a valid e-mail address.')
    setError('')
    onSave({ ...form, name: form.name.trim(), reraId: form.reraId.trim() })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <GlassCard hover={false} className="p-6 max-w-xl">
      <h2 className="text-xl font-bold mb-1">Public agent profile</h2>
      <p className="text-secondary text-sm mb-5">This is what visitors see on your profile and listings once our team has approved you.</p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <ImageField label="Photo" value={form.avatar} onChange={(v) => setForm((f) => ({ ...f, avatar: v }))} />
        <GlassInput label="Name shown to visitors" value={form.name} onChange={set('name')} />
        <GlassInput label="Title" placeholder="Property Consultant" value={form.role} onChange={set('role')} />
        <GlassInput as="select" label="City" value={form.city} onChange={set('city')}>
          <option value="">Select city…</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </GlassInput>
        <GlassInput label="Agency / company (optional)" value={form.agency} onChange={set('agency')} />
        <GlassInput label="RERA agent registration no. (optional)" hint="Shown to visitors — enter only a real, verifiable number." value={form.reraId} onChange={set('reraId')} />
        <GlassInput label="Public e-mail (optional)" type="email" value={form.email} onChange={set('email')} />
        <GlassInput as="textarea" rows={4} label="About you" placeholder="Areas you work in, years of experience, kinds of property…" value={form.bio} onChange={set('bio')} />
        {error && <p role="alert" className="text-[var(--color-danger)] text-sm">{error}</p>}
        <GlassButton type="submit" className="w-full justify-center">{saved ? <><Check size={16} /> Saved</> : 'Save public profile'}</GlassButton>
      </form>
    </GlassCard>
  )
}
