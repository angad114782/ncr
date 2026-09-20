import { Link } from 'react-router-dom'
import GlassCard from '../glass/GlassCard'
import { COMPANY } from '../../data/company'
import { formatPriceShort, listingsPath } from '../../utils/seo'

// Cumulative "under X" budgets — each links to /listings?...&maxPrice=X, which is
// exactly the filter the listings page supports.
const BUY_BUDGETS = [
  { label: 'Under ₹50 Lakh', max: 5000000 },
  { label: 'Under ₹1 Cr', max: 10000000 },
  { label: 'Under ₹2 Cr', max: 20000000 },
  { label: 'Under ₹5 Cr', max: 50000000 },
]
const RENT_BUDGETS = [
  { label: 'Under ₹20,000/mo', max: 20000 },
  { label: 'Under ₹40,000/mo', max: 40000 },
  { label: 'Under ₹75,000/mo', max: 75000 },
  { label: 'Under ₹1.5 L/mo', max: 150000 },
]

export default function ListingsSeoContent({ heading, filters, filtered, active, cities, types, faqs, localities }) {
  const { purpose, city, type, beds } = filters
  const buy = purpose !== 'Rent'
  const budgets = buy ? BUY_BUDGETS : RENT_BUDGETS
  const prices = filtered.map((p) => p.price).filter((n) => n > 0)
  const newest = [...filtered].map((p) => p.postedDate).filter(Boolean).sort().pop()

  const budgetRows = budgets
    .map((b) => ({ ...b, count: filtered.filter((p) => p.price > 0 && p.price <= b.max).length }))
    .filter((b) => b.count > 0)

  const typeRows = Object.entries(
    filtered.reduce((acc, p) => ({ ...acc, [p.type]: (acc[p.type] || 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1])

  const otherCities = cities.filter((c) => c !== city && active.some((p) => p.city === c && (!purpose || p.purpose === purpose)))
  const otherBhk = [1, 2, 3, 4].filter((n) => String(n) !== beds && active.some((p) => (n === 4 ? p.beds >= 4 : p.beds === n)))
  const otherTypes = types.filter((t) => t !== type && active.some((p) => p.type === t))

  return (
    <section className="mt-14 flex flex-col gap-8" aria-labelledby="seo-content-heading">
      {filtered.length > 0 && (
        <GlassCard hover={false} className="p-6 md:p-8">
          <h2 id="seo-content-heading" className="text-xl md:text-2xl font-bold mb-3">About {heading}</h2>
          <p className="text-secondary leading-relaxed mb-3">
            Browse {filtered.length} listing{filtered.length > 1 ? 's' : ''} of {heading} on {COMPANY.name}
            {prices.length > 0 && <>, priced from <strong className="text-primary">{formatPriceShort(Math.min(...prices))}</strong> to <strong className="text-primary">{formatPriceShort(Math.max(...prices))}</strong></>}.
            Every listing shows price, area, possession status and — where available — the RERA registration number, so
            you can compare options and shortlist with confidence.
          </p>
          <p className="text-secondary leading-relaxed">
            Use the filters to narrow by BHK, budget and possession status, save favourites, and compare up to three
            properties side by side. Not sure what you can afford? Try our{' '}
            <Link to="/" className="text-[var(--color-accent)] font-medium">home-loan budget calculator</Link> on our home page or
            read our{' '}
            <Link to="/blog/first-time-home-buyer-guide-india" className="text-[var(--color-accent)] font-medium">first-time buyer guide</Link>.
            {newest && <span className="text-tertiary"> Newest listing posted on {new Date(newest).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.</span>}
          </p>
        </GlassCard>
      )}

      {(localities.length > 0 || budgetRows.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-6">
          {localities.length > 0 && (
            <GlassCard hover={false} className="p-6">
              <h2 className="text-lg font-bold mb-3">Popular localities</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-secondary border-b border-[var(--glass-border)]">
                    <th className="py-2 font-medium">Locality</th>
                    <th className="py-2 font-medium text-right">Listings</th>
                    <th className="py-2 font-medium text-right">{buy ? 'Avg ₹/sq.ft' : 'Avg rent'}</th>
                  </tr>
                </thead>
                <tbody>
                  {localities.slice(0, 8).map((l) => (
                    <tr key={l.locality} className="border-b border-[var(--glass-border)] last:border-0">
                      <td className="py-2">{l.locality}</td>
                      <td className="py-2 text-right text-secondary">{l.count}</td>
                      <td className="py-2 text-right text-secondary">{l.avg ? (buy ? `₹${Math.round(l.avg).toLocaleString('en-IN')}` : formatPriceShort(l.avg)) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>
          )}

          {budgetRows.length > 0 && (
            <GlassCard hover={false} className="p-6">
              <h2 className="text-lg font-bold mb-3">Browse by budget</h2>
              <ul className="flex flex-col gap-2">
                {budgetRows.map((b) => (
                  <li key={b.label}>
                    <Link
                      to={`${listingsPath(filters)}${listingsPath(filters).includes('?') ? '&' : '?'}maxPrice=${b.max}`}
                      className="glass-weak rounded-[12px] px-4 py-2.5 flex items-center justify-between text-sm hover:text-[var(--color-accent)]"
                    >
                      <span>{b.label}</span>
                      <span className="text-tertiary">{b.count} listing{b.count > 1 ? 's' : ''}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {typeRows.length > 1 && (
                <>
                  <h2 className="text-lg font-bold mt-6 mb-3">By property type</h2>
                  <div className="flex flex-wrap gap-2">
                    {typeRows.map(([t, n]) => (
                      <Link key={t} to={listingsPath({ ...filters, type: t })} className="glass-weak rounded-full px-3.5 py-1.5 text-sm">
                        {t} <span className="text-tertiary">({n})</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </GlassCard>
          )}
        </div>
      )}

      {faqs.length > 0 && (
        <div>
          <h2 className="text-xl md:text-2xl font-bold mb-4">{heading} — FAQs</h2>
          <div className="flex flex-col gap-3">
            {faqs.map((f) => (
              <GlassCard key={f.question} hover={false} className="p-5">
                <h3 className="font-semibold mb-1.5">{f.question}</h3>
                <p className="text-secondary text-sm leading-relaxed">{f.answer}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {(otherCities.length > 0 || otherBhk.length > 0 || otherTypes.length > 0) && (
        <GlassCard hover={false} className="p-6">
          <h2 className="text-lg font-bold mb-4">Explore related searches</h2>
          <div className="flex flex-col gap-4">
            {otherCities.length > 0 && (
              <LinkGroup title={`${type ? `${type}s` : 'Properties'} ${purpose === 'Rent' ? 'for rent' : 'for sale'} in other cities`}>
                {otherCities.map((c) => (
                  <Link key={c} to={listingsPath({ ...filters, city: c })} className="glass-weak rounded-full px-3.5 py-1.5 text-sm hover:text-[var(--color-accent)]">
                    {beds ? `${beds === '4' ? '4+' : beds} BHK ` : ''}{type || 'Property'} in {c}
                  </Link>
                ))}
              </LinkGroup>
            )}
            {otherBhk.length > 0 && (
              <LinkGroup title="Search by BHK">
                {otherBhk.map((n) => (
                  <Link key={n} to={listingsPath({ ...filters, beds: String(n) })} className="glass-weak rounded-full px-3.5 py-1.5 text-sm hover:text-[var(--color-accent)]">
                    {n === 4 ? '4+' : n} BHK {city ? `in ${city}` : 'flats'}
                  </Link>
                ))}
              </LinkGroup>
            )}
            {otherTypes.length > 0 && (
              <LinkGroup title="Other property types">
                {otherTypes.map((t) => (
                  <Link key={t} to={listingsPath({ ...filters, type: t })} className="glass-weak rounded-full px-3.5 py-1.5 text-sm hover:text-[var(--color-accent)]">
                    {t}{city ? ` in ${city}` : ''}
                  </Link>
                ))}
              </LinkGroup>
            )}
            <LinkGroup title="Buying guides">
              <Link to="/blog/ready-to-move-vs-under-construction" className="glass-weak rounded-full px-3.5 py-1.5 text-sm hover:text-[var(--color-accent)]">Ready-to-move vs under-construction</Link>
              <Link to="/blog/how-to-check-rera-registration" className="glass-weak rounded-full px-3.5 py-1.5 text-sm hover:text-[var(--color-accent)]">How to check RERA</Link>
              <Link to="/blog/home-loan-eligibility-emi-explained" className="glass-weak rounded-full px-3.5 py-1.5 text-sm hover:text-[var(--color-accent)]">Home loan & EMI explained</Link>
            </LinkGroup>
          </div>
        </GlassCard>
      )}
    </section>
  )
}

function LinkGroup({ title, children }) {
  return (
    <div>
      <p className="text-tertiary text-xs uppercase font-semibold mb-2">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
