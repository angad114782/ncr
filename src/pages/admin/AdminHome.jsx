import { Building2, IndianRupee, MessageSquare, Users } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import { useData } from '../../context/DataContext'
import { useSettings } from '../../context/SettingsContext'

export default function AdminHome() {
  const { properties, inquiries, agents, blogPosts, faqs } = useData()
  const { company } = useSettings()

  const totalValue = properties.reduce((sum, p) => sum + (p.active !== false && p.purpose === 'Buy' ? p.price : 0), 0)
  const pendingInquiries = inquiries.filter((i) => i.status === 'Pending').length

  const stats = [
    { icon: Building2, label: 'Active Listings', value: `${properties.filter((p) => p.active !== false).length} / ${properties.length}`, color: 'text-[var(--color-accent)]' },
    { icon: MessageSquare, label: 'Pending Inquiries', value: pendingInquiries, color: 'text-[var(--color-warning)]' },
    { icon: Users, label: 'Approved Agents', value: agents.filter((a) => a.active !== false && a.status === 'approved').length, color: 'text-[var(--color-success)]' },
    { icon: IndianRupee, label: 'Portfolio Value (Buy)', value: `₹${(totalValue / 10000000).toFixed(1)} Cr`, color: 'text-[var(--color-accent-2)]' },
  ]

  const byCity = properties.reduce((acc, p) => {
    acc[p.city] = (acc[p.city] || 0) + 1
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Admin Overview</h1>
        <p className="text-secondary">Snapshot of the {company.name} platform.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <GlassCard hover={false} key={s.label} className="p-5">
            <s.icon className={`mb-2 ${s.color}`} size={22} />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-secondary text-sm">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard hover={false} className="p-6">
        <h3 className="font-semibold mb-4">Listings by City</h3>
        <div className="flex flex-col gap-3">
          {Object.entries(byCity).map(([city, count]) => (
            <div key={city} className="flex items-center gap-3">
              <span className="text-sm w-24 shrink-0">{city}</span>
              <div className="flex-1 h-2.5 rounded-full glass-weak overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)]"
                  style={{ width: `${(count / properties.length) * 100}%` }}
                />
              </div>
              <span className="text-sm text-secondary w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
