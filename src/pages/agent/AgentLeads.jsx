import { MessageCircle, Phone } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import { useData } from '../../context/DataContext'
import { useMyAgent } from './useMyAgent'

/** Enquiries that came in on the agent's own listings — and only those. */
export default function AgentLeads() {
  const { properties, leads } = useMyAgent()
  const { updateInquiryStatus } = useData()

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold mb-1">Enquiries</h1>
      <p className="text-secondary mb-6">{leads.length} enquir{leads.length === 1 ? 'y' : 'ies'} on your listings</p>

      {leads.length === 0 && (
        <GlassCard hover={false} className="p-10 text-center text-secondary">
          Nothing yet. When someone enquires on one of your live listings, it shows up here with their number.
        </GlassCard>
      )}

      <div className="flex flex-col gap-4">
        {leads.map((l) => {
          const property = properties.find((p) => p.id === l.propertyId)
          const digits = String(l.phone ?? '').replace(/\D/g, '')
          return (
            <GlassCard hover={false} key={l.id} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{property?.title ?? 'Your listing'}</p>
                <p className="text-secondary text-sm">{l.userName} · {l.phone}</p>
                {l.budget && <p className="text-secondary text-xs mt-0.5">Budget: {l.budget}</p>}
                <p className="text-secondary text-sm mt-1">{l.message}</p>
                <p className="text-tertiary text-xs mt-1">{l.date}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {digits && (
                  <>
                    <a href={`tel:+${digits.length === 10 ? `91${digits}` : digits}`} aria-label={`Call ${l.userName}`} className="glass w-9 h-9 rounded-full flex items-center justify-center"><Phone size={14} /></a>
                    <a href={`https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${l.userName}`} className="glass w-9 h-9 rounded-full flex items-center justify-center text-[#25D366]"><MessageCircle size={14} /></a>
                  </>
                )}
                <select value={l.status} onChange={(e) => updateInquiryStatus(l.id, e.target.value)} aria-label="Enquiry status" className="glass-weak rounded-[12px] px-3 py-2 text-sm outline-none">
                  <option value="Pending">Pending</option>
                  <option value="Responded">Responded</option>
                </select>
              </div>
            </GlassCard>
          )
        })}
      </div>
    </div>
  )
}
