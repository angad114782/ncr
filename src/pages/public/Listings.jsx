import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LayoutGrid, List, MapPin, Search, SlidersHorizontal, X } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassInput from '../../components/glass/GlassInput'
import GlassButton from '../../components/glass/GlassButton'
import PropertyCard from '../../components/property/PropertyCard'
import Seo from '../../components/layout/Seo'
import ListingsSeoContent from '../../components/listings/ListingsSeoContent'
import { buildListingsFaqs, summariseLocalities } from '../../utils/listingsSeo'
import { useData } from '../../context/DataContext'
import { useSettings } from '../../context/SettingsContext'
import { SITE_URL, breadcrumbLd, faqLd, formatPriceShort, listingsHeading, listingsPath } from '../../utils/seo'

const PAGE_SIZE = 6

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'area-desc', label: 'Area: Largest First' },
]

const BHK_OPTIONS = ['1', '2', '3', '4']

export default function Listings() {
  const { activeProperties: properties } = useData()
  const { cities, propertyTypes: types, siteContent, company } = useSettings()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState('grid')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sort, setSort] = useState('newest')

  const purpose = params.get('purpose') || ''
  const city = params.get('city') || ''
  const type = params.get('type') || ''
  const beds = params.get('beds') || ''
  const possession = params.get('possession') || ''
  const q = params.get('q') || ''
  const maxPrice = params.get('maxPrice') || ''
  const requestedPage = Math.max(1, Number(params.get('page')) || 1)

  // Changing any filter drops the page param so results never land on an
  // out-of-range page (the page lives in the URL, not in component state).
  const updateParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page')
    setParams(next)
  }

  const setPage = (n) => {
    const next = new URLSearchParams(params)
    if (n > 1) next.set('page', String(n))
    else next.delete('page')
    setParams(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filtered = useMemo(() => {
    const result = properties.filter((p) => {
      if (purpose && p.purpose !== purpose) return false
      if (city && p.city !== city) return false
      if (type && p.type !== type) return false
      if (beds && (beds === '4' ? p.beds < 4 : p.beds !== Number(beds))) return false
      if (possession && p.possessionStatus !== possession) return false
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
  }, [properties, purpose, city, type, beds, possession, q, maxPrice, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(requestedPage, totalPages)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const activeFilterCount = [purpose, city, type, beds, possession, maxPrice].filter(Boolean).length

  // ---- SEO ----
  const filters = { purpose, city, type, beds, possession }
  const heading = listingsHeading(filters)
  const prices = filtered.map((p) => p.price).filter((n) => n > 0)
  const priceText = prices.length ? ` from ${formatPriceShort(Math.min(...prices))} to ${formatPriceShort(Math.max(...prices))}` : ''
  const localities = useMemo(() => summariseLocalities(filtered, purpose !== 'Rent'), [filtered, purpose])
  const faqs = useMemo(() => buildListingsFaqs({ heading, filtered, localities, brand: company.name }), [heading, filtered, localities, company.name])

  // Free-text search, price caps and empty result sets are thin / duplicate
  // pages — keep them out of the index and let the clean filter URLs rank.
  const noindex = Boolean(q || maxPrice) || filtered.length === 0
  const path = listingsPath(filters, page)

  const jsonLd = [
    breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: 'Listings', path: '/listings' },
      ...(city || type || beds || possession || purpose ? [{ name: heading, path }] : []),
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: heading,
      numberOfItems: filtered.length,
      itemListElement: paginated.map((p, i) => ({
        '@type': 'ListItem',
        position: (page - 1) * PAGE_SIZE + i + 1,
        url: `${SITE_URL}/property/${p.id}`,
        name: p.title,
      })),
    },
    ...(faqs.length ? [faqLd(faqs)] : []),
  ]

  return (
    <div className="pb-16">
      <Seo
        title={`${heading}${filtered.length ? ` — ${filtered.length}+ Listings` : ''}`}
        description={`${heading}: browse ${filtered.length} listing${filtered.length === 1 ? '' : 's'}${priceText}. Compare price, BHK, area, possession status and RERA details, then talk to a verified agent on ${company.name}.`}
        path={path}
        noindex={noindex}
        jsonLd={jsonLd}
      />

      <div className="flex flex-col md:flex-row gap-6">
        {/* Filters sidebar */}
        <aside className={`md:w-72 shrink-0 md:sticky md:top-28 md:self-start ${filtersOpen ? 'block' : 'hidden'} md:block`}>
          <GlassCard hover={false} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <SlidersHorizontal size={16} /> Filters
              </h2>
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
                <p className="text-sm font-medium text-secondary mb-2">BHK</p>
                <div className="flex flex-wrap gap-2">
                  {BHK_OPTIONS.map((n) => (
                    <button
                      key={n}
                      onClick={() => updateParam('beds', beds === n ? '' : n)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium spring ${
                        beds === n ? 'glass-strong text-[var(--color-accent)]' : 'glass-weak text-secondary'
                      }`}
                    >
                      {n === '4' ? '4+ BHK' : `${n} BHK`}
                    </button>
                  ))}
                </div>
              </div>

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

              <div>
                <p className="text-sm font-medium text-secondary mb-2">Possession</p>
                <div className="flex flex-wrap gap-2">
                  {siteContent.options.possession.map((o) => (
                    <button
                      key={o}
                      onClick={() => updateParam('possession', possession === o ? '' : o)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium spring ${
                        possession === o ? 'glass-strong text-[var(--color-accent)]' : 'glass-weak text-secondary'
                      }`}
                    >
                      {o}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold">{heading}</h1>
              <p className="text-secondary text-sm">
                {filtered.length} propert{filtered.length === 1 ? 'y' : 'ies'} found
                {page > 1 ? ` · page ${page} of ${totalPages}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
                aria-label="Sort properties"
                className="glass rounded-full px-4 py-2.5 text-sm outline-none"
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div className="glass rounded-full p-1 hidden sm:flex">
                <button
                  onClick={() => setView('grid')}
                  aria-label="Grid view"
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${view === 'grid' ? 'glass-strong text-[var(--color-accent)]' : 'text-secondary'}`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setView('list')}
                  aria-label="List view"
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
                    onClick={() => setPage(Math.max(1, page - 1))}
                    aria-label="Previous page"
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
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    aria-label="Next page"
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

      <ListingsSeoContent
        heading={heading}
        filters={filters}
        filtered={filtered}
        active={properties}
        cities={cities}
        types={types}
        faqs={faqs}
        localities={localities}
      />
    </div>
  )
}
