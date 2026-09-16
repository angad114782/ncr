import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LayoutGrid, List, MapPin, Search, SlidersHorizontal, X } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassInput from '../../components/glass/GlassInput'
import GlassButton from '../../components/glass/GlassButton'
import PropertyCard from '../../components/property/PropertyCard'
import { useData } from '../../context/DataContext'

const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai', 'Gurugram']
const types = ['Apartment', 'Villa', 'Studio', 'Commercial', 'Penthouse', 'House']
const PAGE_SIZE = 6

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'area-desc', label: 'Area: Largest First' },
]

export default function Listings() {
  const { activeProperties: properties } = useData()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState('grid')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)

  const purpose = params.get('purpose') || ''
  const city = params.get('city') || ''
  const type = params.get('type') || ''
  const q = params.get('q') || ''
  const maxPrice = params.get('maxPrice') || ''

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
    setPage(1)
  }

  const filtered = useMemo(() => {
    const result = properties.filter((p) => {
      if (purpose && p.purpose !== purpose) return false
      if (city && p.city !== city) return false
      if (type && p.type !== type) return false
      if (maxPrice && p.price > Number(maxPrice)) return false
      if (q) {
        const hay = `${p.title} ${p.locality} ${p.city}`.toLowerCase()
        if (!hay.includes(q.toLowerCase())) return false
      }
      return true
    })

    const sorted = [...result]
    if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price)
    else if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price)
    else if (sort === 'area-desc') sorted.sort((a, b) => b.areaSqft - a.areaSqft)
    else sorted.sort((a, b) => new Date(b.postedDate || 0) - new Date(a.postedDate || 0))

    return sorted
  }, [properties, purpose, city, type, q, maxPrice, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const activeFilterCount = [purpose, city, type, maxPrice].filter(Boolean).length

  return (
    <div className="pb-16 flex flex-col md:flex-row gap-6">
      {/* Filters sidebar */}
      <aside className={`md:w-72 shrink-0 md:sticky md:top-28 md:self-start ${filtersOpen ? 'block' : 'hidden'} md:block`}>
        <GlassCard hover={false} className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <SlidersHorizontal size={16} /> Filters
            </h3>
            {activeFilterCount > 0 && (
              <button
                className="text-xs text-[var(--color-accent)] font-medium"
                onClick={() => setParams({})}
              >
                Clear all
              </button>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <GlassInput
              icon={Search}
              placeholder="Search locality, project..."
              value={q}
              onChange={(e) => updateParam('q', e.target.value)}
            />

            <div>
              <p className="text-sm font-medium text-secondary mb-2">Purpose</p>
              <div className="flex gap-2">
                {['Buy', 'Rent'].map((p) => (
                  <button
                    key={p}
                    onClick={() => updateParam('purpose', purpose === p ? '' : p)}
                    className={`flex-1 py-2 rounded-[12px] text-sm font-medium spring ${
                      purpose === p ? 'glass-strong text-[var(--color-accent)]' : 'glass-weak text-secondary'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <GlassInput as="select" icon={MapPin} label="City" value={city} onChange={(e) => updateParam('city', e.target.value)}>
              <option value="">All Cities</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </GlassInput>

            <div>
              <p className="text-sm font-medium text-secondary mb-2">Property Type</p>
              <div className="flex flex-wrap gap-2">
                {types.map((t) => (
                  <button
                    key={t}
                    onClick={() => updateParam('type', type === t ? '' : t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium spring ${
                      type === t ? 'glass-strong text-[var(--color-accent)]' : 'glass-weak text-secondary'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <GlassInput
              label="Max Price (₹)"
              type="number"
              placeholder="e.g. 5000000"
              value={maxPrice}
              onChange={(e) => updateParam('maxPrice', e.target.value)}
            />
          </div>
        </GlassCard>
      </aside>

      {/* Results */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-5 gap-3">
          <div>
            <h1 className="text-2xl font-bold">{filtered.length} Properties Found</h1>
            <p className="text-secondary text-sm">Showing results across India</p>
          </div>
          <div className="flex items-center gap-2">
            <GlassButton
              variant="glass"
              size="sm"
              className="md:hidden"
              onClick={() => setFiltersOpen((v) => !v)}
              icon={filtersOpen ? X : SlidersHorizontal}
            >
              {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
            </GlassButton>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1) }}
              className="glass rounded-full px-4 py-2.5 text-sm outline-none"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <div className="glass rounded-full p-1 hidden sm:flex">
              <button
                onClick={() => setView('grid')}
                className={`w-9 h-9 rounded-full flex items-center justify-center ${view === 'grid' ? 'glass-strong text-[var(--color-accent)]' : 'text-secondary'}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setView('list')}
                className={`w-9 h-9 rounded-full flex items-center justify-center ${view === 'list' ? 'glass-strong text-[var(--color-accent)]' : 'text-secondary'}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <GlassCard hover={false} className="p-12 text-center">
            <p className="text-secondary">No properties match your filters. Try adjusting your search.</p>
          </GlassCard>
        ) : (
          <>
            <div className={view === 'grid' ? 'grid sm:grid-cols-2 xl:grid-cols-3 gap-5' : 'flex flex-col gap-4'}>
              {paginated.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="glass w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 spring hover:scale-105"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-10 h-10 rounded-full text-sm font-medium spring ${
                      page === n ? 'glass-strong text-[var(--color-accent)]' : 'glass text-secondary'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="glass w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 spring hover:scale-105"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
