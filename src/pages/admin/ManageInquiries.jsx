import { useState } from 'react'
import { BadgeCheck, Download, IndianRupee, Search, Trash2 } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import { useData } from '../../context/DataContext'
import { downloadCsv, inquiriesToCsv } from '../../utils/csv'

export default function ManageInquiries() {
  const { inquiries, properties, updateInquiryStatus, deleteInquiry } = useData()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')

  const q = query.trim().toLowerCase()
  const shown = inquiries.filter(
    (i) => (status === 'all' || i.status === status) && (!q || `${i.userName} ${i.phone} ${i.userEmail} ${i.message} ${i.city ?? ''}`.toLowerCase().includes(q)),
  )

  const handleExport = () => {
    const csv = inquiriesToCsv(inquiries, properties)
    downloadCsv(`leads-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Manage Inquiries</h1>
          <p className="text-secondary">{inquiries.length} total inquiries</p>
        </div>
        <GlassButton variant="glass" size="sm" icon={Download} onClick={handleExport} disabled={inquiries.length === 0}>
          Export Leads CSV
        </GlassButton>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="glass-weak rounded-full flex items-center gap-2 px-4 h-10 flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="text-tertiary" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone, message…" aria-label="Search inquiries" className="bg-transparent outline-none w-full text-sm" />
        </div>
        <div className="glass-weak p-1 rounded-full flex">
          {[['all', 'All'], ['Pending', 'Pending'], ['Responded', 'Responded']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setStatus(v)} className={`px-3.5 py-1.5 rounded-full text-xs font-medium spring ${status === v ? 'glass-strong text-[var(--color-accent)]' : 'text-secondary'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {shown.length === 0 && <p className="text-secondary glass-weak rounded-[16px] p-6 text-center">No inquiries match.</p>}
        {shown.map((inq) => {
          const property = properties.find((p) => p.id === inq.propertyId)
          return (
            <GlassCard hover={false} key={inq.id} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
              {property && (
                <img src={property.images[0]} alt="" className="w-full md:w-24 h-16 rounded-[12px] object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {inq.propertyId ? (property?.title ?? 'Property removed') : 'General enquiry (contact form)'}
                </p>
                <p className="text-secondary text-sm truncate flex items-center gap-1.5">
                  {[inq.userName, inq.userEmail, inq.phone].filter(Boolean).join(' · ')}
                  {inq.phoneVerified && (
                    <span className="text-[var(--color-success)] shrink-0" title="Phone verified via OTP">
                      <BadgeCheck size={13} />
                    </span>
                  )}
                </p>
                {inq.budget && (
                  <p className="text-secondary text-xs mt-0.5 flex items-center gap-1">
                    <IndianRupee size={11} /> Budget: {inq.budget}
                  </p>
                )}
                <p className="text-secondary text-sm mt-1">{inq.message}</p>
                <p className="text-tertiary text-xs mt-1">{inq.date}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={inq.status}
                  onChange={(e) => updateInquiryStatus(inq.id, e.target.value)}
                  className="glass-weak rounded-[12px] px-3 py-2 text-sm outline-none"
                >
                  <option value="Pending">Pending</option>
                  <option value="Responded">Responded</option>
                </select>
                <button
                  onClick={() => deleteInquiry(inq.id)}
                  className="glass w-9 h-9 rounded-full flex items-center justify-center spring hover:scale-105 text-[var(--color-danger)]"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </GlassCard>
          )
        })}
      </div>
    </div>
  )
}
