import { BadgeCheck, Download, IndianRupee, Trash2 } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import { useData } from '../../context/DataContext'
import { downloadCsv, inquiriesToCsv } from '../../utils/csv'

export default function ManageInquiries() {
  const { inquiries, properties, updateInquiryStatus, deleteInquiry } = useData()

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

      <div className="flex flex-col gap-4">
        {inquiries.map((inq) => {
          const property = properties.find((p) => p.id === inq.propertyId)
          return (
            <GlassCard hover={false} key={inq.id} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
              {property && (
                <img src={property.images[0]} alt="" className="w-full md:w-24 h-16 rounded-[12px] object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{property?.title ?? 'Property removed'}</p>
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
