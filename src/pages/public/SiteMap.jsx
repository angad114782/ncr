import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import GlassCard from '../../components/glass/GlassCard'
import Seo from '../../components/layout/Seo'
import { useData } from '../../context/DataContext'
import { useSettings } from '../../context/SettingsContext'
import { landingCombos } from '../../utils/listingsUrl'
import { SITE_URL, breadcrumbLd, listingsHeading, propertyPath } from '../../utils/seo'

const PAGES = [
  ['/', 'Home'],
  ['/about', 'About us'],
  ['/team', 'Our team'],
  ['/agents', 'Property consultants'],
  ['/blog', 'Property blog & guides'],
  ['/contact', 'Contact us'],
  ['/compare', 'Compare properties'],
  ['/privacy', 'Privacy policy'],
  ['/terms', 'Terms & conditions'],
  ['/disclaimer', 'Disclaimer'],
  ['/listings', 'All listings'],
]

function Group({ title, children }) {
  return (
    <GlassCard hover={false} className="p-6">
      <h2 className="text-lg font-bold mb-3">{title}</h2>
      <ul className="flex flex-col gap-1.5 text-sm">{children}</ul>
    </GlassCard>
  )
}

const Item = ({ to, children, note }) => (
  <li>
    <Link to={to} className="text-secondary hover:text-[var(--color-accent)]">{children}</Link>
    {note ? <span className="text-tertiary"> {note}</span> : null}
  </li>
)

/**
 * HTML site map: one crawlable page that links to every city, BHK, property type, guide, consultant
 * and listing. Built from live data, so a new city, post or listing shows up here automatically —
 * the fastest way for Googlebot (and visitors) to reach every important page.
 */
export default function SiteMap() {
  const { activeProperties, activeBlogPosts, approvedAgents } = useData()
  const { cities, propertyTypes: types, company } = useSettings()

  const combos = useMemo(() => landingCombos(activeProperties, cities, types), [activeProperties, cities, types])
  // Landing pages of one shape, e.g. pick('Buy', ['city', 'beds']) → 2 BHK flats for sale in each city.
  const pick = (purpose, keys) => {
    const shape = [...keys].sort().join()
    return combos.filter((l) => l.filters.purpose === purpose && Object.keys(l.filters).filter((k) => k !== 'purpose').sort().join() === shape)
  }

  const byCategory = useMemo(() => {
    const map = new Map()
    activeBlogPosts.forEach((p) => map.set(p.category || 'General', [...(map.get(p.category || 'General') ?? []), p]))
    return [...map.entries()]
  }, [activeBlogPosts])

  const propertiesByCity = cities
    .map((city) => ({ city, items: activeProperties.filter((p) => p.city === city) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="pb-16">
      <Seo
        title="Site Map — All Cities, Property Types, Guides and Listings"
        description={`Every page on ${company.name} in one place: flats and houses to buy or rent by city, BHK and property type, buying guides, property consultants and listings.`}
        path="/sitemap"
        jsonLd={breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Site map', path: '/sitemap' }])}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-secondary mb-4">
        <Link to="/" className="hover:text-primary">Home</Link> / <span className="text-primary">Site map</span>
      </nav>
      <h1 className="text-3xl md:text-4xl font-bold mb-2">Site map</h1>
      <p className="text-secondary mb-8 max-w-2xl">
        Everything on {company.name}, grouped so you can jump straight to the city, budget-friendly BHK size, property type or guide you need.
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        <Group title="Main pages">
          {PAGES.map(([to, label]) => <Item key={to} to={to}>{label}</Item>)}
        </Group>

        {['Buy', 'Rent'].map((purpose) => (
          <Group key={purpose} title={purpose === 'Buy' ? 'Properties for sale by city' : 'Properties for rent by city'}>
            {pick(purpose, []).map((l) => <Item key={l.path} to={l.path} note={`(${l.count})`}>{listingsHeading(l.filters)}</Item>)}
            {pick(purpose, ['city']).map((l) => <Item key={l.path} to={l.path} note={`(${l.count})`}>{listingsHeading(l.filters)}</Item>)}
          </Group>
        ))}

        {['Buy', 'Rent'].map((purpose) => (
          <Group key={`bhk-${purpose}`} title={purpose === 'Buy' ? 'Flats for sale by BHK' : 'Flats for rent by BHK'}>
            {pick(purpose, ['beds']).map((l) => <Item key={l.path} to={l.path} note={`(${l.count})`}>{listingsHeading(l.filters)}</Item>)}
            {pick(purpose, ['city', 'beds']).map((l) => <Item key={l.path} to={l.path}>{listingsHeading(l.filters)}</Item>)}
          </Group>
        ))}

        {['Buy', 'Rent'].map((purpose) => (
          <Group key={`type-${purpose}`} title={purpose === 'Buy' ? 'Property types for sale' : 'Property types for rent'}>
            {pick(purpose, ['type']).map((l) => <Item key={l.path} to={l.path} note={`(${l.count})`}>{listingsHeading(l.filters)}</Item>)}
            {pick(purpose, ['city', 'type']).map((l) => <Item key={l.path} to={l.path}>{listingsHeading(l.filters)}</Item>)}
          </Group>
        ))}

        {byCategory.map(([category, posts]) => (
          <Group key={category} title={`Guides — ${category}`}>
            {posts.map((p) => <Item key={p.id} to={`/blog/${p.slug}`}>{p.title}</Item>)}
          </Group>
        ))}

        {approvedAgents.length > 0 && (
          <Group title="Property consultants">
            {approvedAgents.map((a) => <Item key={a.id} to={`/agents/${a.id}`} note={`— ${a.city}`}>{a.name}</Item>)}
          </Group>
        )}

        {propertiesByCity.map(({ city, items }) => (
          <Group key={city} title={`All listings in ${city}`}>
            {items.map((p) => <Item key={p.id} to={propertyPath(p)}>{p.title}</Item>)}
          </Group>
        ))}
      </div>

      <p className="text-tertiary text-xs mt-8">
        Machine-readable versions: <a href={`${SITE_URL}/sitemap.xml`} className="underline">sitemap.xml</a>,{' '}
        <a href={`${SITE_URL}/llms.txt`} className="underline">llms.txt</a>, <a href={`${SITE_URL}/feed.xml`} className="underline">RSS feed</a>.
      </p>
    </div>
  )
}
