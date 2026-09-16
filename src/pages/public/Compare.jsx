import { Fragment } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import { useData } from '../../context/DataContext'

const rows = [
  { key: 'priceLabel', label: 'Price' },
  { key: 'type', label: 'Type' },
  { key: 'purpose', label: 'Purpose' },
  { key: 'beds', label: 'Bedrooms' },
  { key: 'baths', label: 'Bathrooms' },
  { key: 'areaSqft', label: 'Area (sqft)' },
  { key: 'furnishing', label: 'Furnishing' },
  { key: 'possessionStatus', label: 'Possession' },
  { key: 'yearBuilt', label: 'Year Built' },
]

export default function Compare() {
  const { properties, compareIds, toggleCompare } = useData()
  const navigate = useNavigate()
  const items = properties.filter((p) => compareIds.includes(p.id))

  if (items.length < 2) {
    return (
      <GlassCard hover={false} className="p-12 text-center my-12">
        <p className="text-secondary mb-4">Select at least 2 properties to compare. Use the compare icon on any property card.</p>
        <GlassButton onClick={() => navigate('/listings')}>Browse Listings</GlassButton>
      </GlassCard>
    )
  }

  const allAmenities = [...new Set(items.flatMap((p) => p.amenities))]

  return (
    <div className="pb-16">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Compare Properties</h1>

      <div className="overflow-x-auto">
        <GlassCard hover={false} className="p-0 min-w-[640px]">
          <div className={`grid`} style={{ gridTemplateColumns: `160px repeat(${items.length}, 1fr)` }}>
            <div className="p-4" />
            {items.map((p) => (
              <div key={p.id} className="p-4 border-l border-[var(--glass-border)]">
                <button
                  onClick={() => toggleCompare(p.id)}
                  className="glass w-7 h-7 rounded-full flex items-center justify-center mb-2 ml-auto"
                >
                  <X size={13} />
                </button>
                <img src={p.images[0]} alt={p.title} className="w-full h-28 rounded-[14px] object-cover mb-2" />
                <Link to={`/property/${p.id}`} className="font-semibold text-sm hover:text-[var(--color-accent)] block truncate">
                  {p.title}
                </Link>
                <p className="text-tertiary text-xs truncate">{p.locality}, {p.city}</p>
              </div>
            ))}

            {rows.map((row) => (
              <Fragment key={row.key}>
                <div className="p-4 text-sm font-medium text-secondary border-t border-[var(--glass-border)]">
                  {row.label}
                </div>
                {items.map((p) => (
                  <div key={p.id + row.key} className="p-4 text-sm border-t border-l border-[var(--glass-border)]">
                    {row.key === 'beds' && p[row.key] === 0 ? '—' : String(p[row.key] ?? '—')}
                  </div>
                ))}
              </Fragment>
            ))}

            <div className="p-4 text-sm font-medium text-secondary border-t border-[var(--glass-border)]">
              Amenities
            </div>
            {items.map((p) => (
              <div key={p.id + 'amenities'} className="p-4 text-sm border-t border-l border-[var(--glass-border)] flex flex-col gap-1.5">
                {allAmenities.map((a) => (
                  <span key={a} className={`flex items-center gap-1.5 ${p.amenities.includes(a) ? '' : 'text-tertiary line-through'}`}>
                    {p.amenities.includes(a) ? <Check size={12} className="text-[var(--color-success)]" /> : <X size={12} />}
                    {a}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
