import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LayoutGrid, List, MapPin, Search, SlidersHorizontal, X } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassInput from '../../components/glass/GlassInput'
import GlassButton from '../../components/glass/GlassButton'
import PropertyCard from '../../components/property/PropertyCard'
import Seo from '../../components/layout/Seo'
import NotFound from './NotFound'
import { scrollToY } from '../../utils/smoothScroll'
import ListingsSeoContent from '../../components/listings/ListingsSeoContent'
import { buildListingsFaqs, summariseLocalities } from '../../utils/listingsSeo'
import { useData } from '../../context/DataContext'
import { useInterest } from '../../context/InterestContext'
import { useSettings } from '../../context/SettingsContext'
import { SITE_URL, breadcrumbLd, cityAliasesOf, faqLd, formatPriceShort, listingsHeading, listingsPath, propertyPath, resolveListingsSegments } from '../../utils/seo'

const PAGE_SIZE = 6

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'area-desc', label: 'Area: Largest First' },
]

const BHK_OPTIONS = ['1', '2', '3', '4']

const PAGE_LINK_BASE = 'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-medium spring shrink-0'

/** Pagination is real links (`?page=N`) so crawlers can walk every page of results. */
function PageLink({ to, children, current, disabled, rel, label }) {
  if (disabled) {
    return <span aria-disabled="true" aria-label={label} className={`${PAGE_LINK_BASE} glass opacity-30`}>{children}</span>
  }
  return (
    <Link
      to={to}
      rel={rel}
      aria-label={label}
      aria-current={current ? 'page' : undefined}
      state={{ keepScroll: true }}
      onClick={() => scrollToY(0)}
      className={`${PAGE_LINK_BASE} ${current ? 'glass-strong text-[var(--color-accent)]' : 'glass text-secondary hover:scale-105'}`}
    >
      {children}
    </Link>
  )
}

/**
 * Windowed page numbers with an ellipsis (1 … 5 6 7 … 17) instead of printing every page — with
 * 17-18 pages a flat 1..N row wraps into a wall of buttons on both desktop and mobile. The `…`
 * spots are never links: rel="next"/"prev" on the arrow buttons still lets crawlers walk every
 * page in a chain even when a page number isn't directly visible.
 */
function paginationItems(current, total, siblings = 1) {
  const range = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => start + i)
  const totalVisible = siblings * 2 + 5 // first + last + current + siblings on each side + 2 dots
  if (total <= totalVisible) return range(1, total)

  const left = Math.max(current - siblings, 1)
  const right = Math.min(current + siblings, total)
  const showLeftDots = left > 2
  const showRightDots = right < total - 1

  if (!showLeftDots && showRightDots) return [...range(1, 3 + siblings * 2), '…', total]
  if (showLeftDots && !showRightDots) return [1, '…', ...range(total - (2 + siblings * 2), total)]
  return [1, '…', ...range(left, right), '…', total]
}

/**
 * Text inputs whose value lives in the URL (?q=, ?maxPrice=) must not be driven by the URL
 * directly: React Router applies URL updates in a low-priority transition, so fast typing
 * dropped characters ("bandra" → "aa"). Keep the text locally, push it to the URL after a
 * short pause, and only accept URL changes that didn't come from us (Clear all, links).
 */
function useUrlField(urlValue, push, delay = 250) {
  const [text, setText] = useState(urlValue)
  const lastPushed = useRef(urlValue)
  const pushRef = useRef(push)
  pushRef.current = push

  useEffect(() => {
    if (urlValue !== lastPushed.current) {
      lastPushed.current = urlValue
      setText(urlValue)
    }
  }, [urlValue])

  useEffect(() => {
    if (text === lastPushed.current) return undefined
    const t = setTimeout(() => {
      lastPushed.current = text
      pushRef.current(text)
    }, delay)
    return () => clearTimeout(t)
  }, [text, delay])

  return [text, setText]
}

/** Path + the non-category query bits (search text, price cap) that ride along on every URL. */
function withExtras(base, { q, maxPrice }) {
  const extra = new URLSearchParams()
  if (q) extra.set('q', q)
  if (maxPrice) extra.set('maxPrice', maxPrice)
  const s = extra.toString()
  return s ? `${base}${base.includes('?') ? '&' : '?'}${s}` : base
}

/**
 * /buy, /buy/mumbai, /rent/pune/3-bhk … are the real, indexable landing pages; /listings is the
 * catch-all. Filters come from the path (route `purpose` + :a/:b segments) with possession, page,
 * search text and price cap in the query string. Old /listings?purpose=Buy&city=… links redirect
 * to their clean URL.
 */
export default function Listings({ purpose: routePurpose = '' }) {
  const { a, b } = useParams()
  const [params] = useSearchParams()
  const { cities, propertyTypes: types } = useSettings()

  if (!routePurpose) {
    const legacy = params.get('purpose')
    if (legacy === 'Buy' || legacy === 'Rent') {
      const to = withExtras(
        listingsPath({
          purpose: legacy,
          city: params.get('city') || '',
          type: params.get('type') || '',
          beds: params.get('beds') || '',
          possession: params.get('possession') || '',
        }, Math.max(1, Number(params.get('page')) || 1)),
        { q: params.get('q') || '', maxPrice: params.get('maxPrice') || '' },
      )
      return <Navigate to={to} replace state={{ keepScroll: true }} />
    }
  }

  const resolved = routePurpose ? resolveListingsSegments({ purpose: routePurpose === 'Buy' ? 'Buy' : 'Rent', a, b }, cities, types) : {}
  if (!resolved) return <NotFound />

  const filters = {
    purpose: resolved.purpose || '',
    city: resolved.city || (!routePurpose ? params.get('city') || '' : ''),
    type: resolved.type || (!routePurpose ? params.get('type') || '' : ''),
    beds: resolved.beds || params.get('beds') || '',
    possession: params.get('possession') || '',
  }
  return <ListingsView filters={filters} />
}

function ListingsView({ filters }) {
  const { activeProperties: properties } = useData()
  const { cities, propertyTypes: types, siteContent, company } = useSettings()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [view, setView] = useState('grid')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sort, setSort] = useState('newest')

  const { track } = useInterest()
  const { purpose, city, type, beds, possession } = filters
  const q = params.get('q') || ''
  const maxPrice = params.get('maxPrice') || ''
  const requestedPage = Math.max(1, Number(params.get('page')) || 1)

  /** URL for a set of filters (keeping search text / price cap unless overridden). */
  const urlFor = (next, { page: nextPage = 1, ...extras } = {}) =>
    withExtras(listingsPath(next, nextPage), { q, maxPrice, ...extras })

  // Changing a filter navigates to that filter's clean URL — and drops the page so results never
  // land on an out-of-range page.
  const updateFilter = (key, value) => navigate(urlFor({ ...filters, [key]: value }), { state: { keepScroll: true } })

  const [qText, setQText] = useUrlField(q, (v) => navigate(urlFor(filters, { q: v }), { replace: true, state: { keepScroll: true } }))
  const [maxPriceText, setMaxPriceText] = useUrlField(maxPrice, (v) => navigate(urlFor(filters, { maxPrice: v }), { replace: true, state: { keepScroll: true } }))

  const filtered = useMemo(() => {
    const result = properties.filter((p) => {
      if (purpose && p.purpose !== purpose) return false
      if (city && p.city !== city) return false
      if (type && p.type !== type) return false
      if (beds && (beds === '4' ? p.beds < 4 : p.beds !== Number(beds))) return false
      if (possession && p.possessionStatus !== possession) return false
      if (maxPrice && p.price > Number(maxPrice)) return false
      if (q) {
        // A visitor searching "Gurgaon" should still find listings tagged with the official name "Gurugram".
        const hay = `${p.title} ${p.locality} ${p.city} ${cityAliasesOf(p.city).join(' ')}`.toLowerCase()
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

  // Remember what they searched for (after they stop changing filters for a moment).
  useEffect(() => {
    if (!purpose && !city && !type && !beds && !q && !maxPrice) return undefined
    const t = setTimeout(() => track('search', { purpose, city, type, beds, maxPrice, q }), 1500)
    return () => clearTimeout(t)
  }, [purpose, city, type, beds, q, maxPrice, track])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(requestedPage, totalPages)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const activeFilterCount = [purpose, city, type, beds, possession, maxPrice].filter(Boolean).length

  // ---- SEO ----
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
      { name: purpose === 'Rent' ? 'Rent' : purpose === 'Buy' ? 'Buy' : 'Listings', path: purpose ? listingsPath({ purpose }) : '/listings' },
      ...(city && (type || beds) ? [{ name: `${purpose === 'Rent' ? 'Rent' : 'Buy'} in ${city}`, path: listingsPath({ purpose, city }) }] : []),
      ...(city || type || beds || possession ? [{ name: heading, path }] : []),
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: heading,
      numberOfItems: filtered.length,
      itemListElement: paginated.map((p, i) => ({
        '@type': 'ListItem',
        position: (page - 1) * PAGE_SIZE + i + 1,
        url: `${SITE_URL}${propertyPath(p)}`,
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
                  onClick={() => navigate('/listings', { state: { keepScroll: true } })}
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <GlassInput
                icon={Search}
                placeholder="Search locality, project..."
                value={qText}
                onChange={(e) => setQText(e.target.value)}
              />

              <div>
                <p className="text-sm font-medium text-secondary mb-2">Purpose</p>
                <div className="flex gap-2">
                  {['Buy', 'Rent'].map((p) => (
                    <button
                      key={p}
                      onClick={() => updateFilter('purpose', purpose === p ? '' : p)}
                      className={`flex-1 py-2 rounded-[12px] text-sm font-medium spring ${
                        purpose === p ? 'glass-strong text-[var(--color-accent)]' : 'glass-weak text-secondary'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <GlassInput as="select" icon={MapPin} label="City" value={city} onChange={(e) => updateFilter('city', e.target.value)}>
                <option value="">All Cities</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </GlassInput>

              <div>
                <p className="text-sm font-medium text-secondary mb-2">BHK</p>
                <div className="flex flex-wrap gap-2">
                  {BHK_OPTIONS.map((n) => (
                    <button
                      key={n}
                      onClick={() => updateFilter('beds', beds === n ? '' : n)}
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
                      onClick={() => updateFilter('type', type === t ? '' : t)}
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
                      onClick={() => updateFilter('possession', possession === o ? '' : o)}
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
                value={maxPriceText}
                onChange={(e) => setMaxPriceText(e.target.value)}
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
                onChange={(e) => setSort(e.target.value)}
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
                <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5 sm:gap-2 mt-8">
                  <PageLink to={urlFor(filters, { page: page - 1 })} disabled={page === 1} rel="prev" label="Previous page">
                    <ChevronLeft size={16} />
                  </PageLink>
                  {paginationItems(page, totalPages).map((item, i) =>
                    item === '…' ? (
                      <span key={`dots-${i}`} aria-hidden="true" className={`${PAGE_LINK_BASE} text-secondary`}>
                        …
                      </span>
                    ) : (
                      <PageLink key={item} to={urlFor(filters, { page: item })} current={page === item} label={`Page ${item}`}>
                        {item}
                      </PageLink>
                    ),
                  )}
                  <PageLink to={urlFor(filters, { page: page + 1 })} disabled={page === totalPages} rel="next" label="Next page">
                    <ChevronRight size={16} />
                  </PageLink>
                </nav>
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
