import { useState } from 'react'
import { Check, MapPin, Phone, User } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassInput from '../../components/glass/GlassInput'
import GlassButton from '../../components/glass/GlassButton'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../../components/common/Avatar'
import { USE_API } from '../../api/client'

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const [form, setForm] = useState({ name: user?.name || '', city: user?.city || '', phone: user?.phone || '' })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = (e) => {
    e.preventDefault()
    setError('')
    const result = updateProfile(form)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Profile Settings</h1>

      <GlassCard hover={false} className="p-6 mb-6 flex items-center gap-4">
        <Avatar src={user?.avatar} name={user?.name} className="w-16 h-16 rounded-full" />
        <div>
          <p className="font-semibold text-lg">{user?.name}</p>
          <p className="text-secondary text-sm flex items-center gap-1">
            <Phone size={13} /> +91 {user?.phone}
          </p>
        </div>
      </GlassCard>

      <GlassCard hover={false} className="p-6">
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <GlassInput
            label="Full Name"
            icon={User}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <GlassInput
            label="City"
            icon={MapPin}
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <GlassInput
            label="Mobile Number"
            icon={Phone}
            type="tel"
            inputMode="numeric"
            maxLength={10}
            disabled={USE_API}
            hint={USE_API ? 'Your number is your login. To change it, please contact us.' : undefined}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
          />

          {error && <p className="text-[var(--color-danger)] text-sm px-1">{error}</p>}

          <GlassButton type="submit" className="w-full justify-center mt-2">
            {saved ? <><Check size={16} /> Saved</> : 'Save Changes'}
          </GlassButton>
        </form>
      </GlassCard>
    </div>
  )
}
