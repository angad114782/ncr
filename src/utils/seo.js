import { COMPANY, formatAddress, hasAddress } from '../data/company'

export const SITE_URL = 'https://propertyinncr.com'

export function breadcrumbLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }
}

export function faqLd(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
}

export function personLd() {
  const { ceo } = COMPANY
  return {
    '@type': 'Person',
    '@id': `${SITE_URL}/team#${ceo.name.toLowerCase().replace(/\s+/g, '-')}`,
    name: ceo.name,
    jobTitle: ceo.title,
    url: `${SITE_URL}/team`,
    worksFor: { '@type': 'Organization', name: COMPANY.name, url: SITE_URL },
    knowsAbout: ceo.expertise,
    ...(ceo.photo ? { image: `${SITE_URL}${ceo.photo}` } : {}),
  }
}

export function organizationLd({ phone, email, cities = [] } = {}) {
  const sameAs = Object.values(COMPANY.social).filter(Boolean)
  return {
    '@type': 'RealEstateAgent',
    '@id': `${SITE_URL}/#organization`,
    name: COMPANY.name,
    url: SITE_URL,
    description: COMPANY.tagline,
    ...(phone ? { telephone: `+91${phone}` } : {}),
    ...(email ? { email } : {}),
    ...(cities.length ? { areaServed: cities.map((c) => ({ '@type': 'City', name: c })) } : {}),
    ...(COMPANY.foundedYear ? { foundingDate: String(COMPANY.foundedYear) } : {}),
    founder: personLd(),
    ...(hasAddress()
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: COMPANY.address.street,
            addressLocality: COMPANY.address.city || COMPANY.address.locality,
            addressRegion: COMPANY.address.region,
            postalCode: COMPANY.address.postalCode,
            addressCountry: 'IN',
          },
        }
      : {}),
    ...(COMPANY.officeHours ? { openingHours: COMPANY.officeHours } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  }
}

export { COMPANY, formatAddress, hasAddress }

const PLURAL_TYPE = {
  Apartment: 'Apartments',
  Villa: 'Villas',
  Studio: 'Studios',
  Commercial: 'Commercial Properties',
  Penthouse: 'Penthouses',
  House: 'Houses',
}

/**
 * Buying-intent heading used for the <h1>, <title> and FAQ copy of a listings
 * page, e.g. "3 BHK Flats for Sale in Mumbai" / "Villas for Rent in Pune".
 */
export function listingsHeading({ purpose, city, type, beds, possession }) {
  const bhk = beds ? (beds === '4' ? '4+ BHK ' : `${beds} BHK `) : ''
  let noun = 'Properties'
  if (type) noun = PLURAL_TYPE[type] || `${type}s`
  else if (bhk) noun = 'Flats'
  const ready = possession === 'Ready to Move' ? 'Ready to Move ' : possession === 'Under Construction' ? 'Under Construction ' : ''
  const verb = purpose === 'Rent' ? 'for Rent' : purpose === 'Buy' ? 'for Sale' : 'for Sale & Rent'
  return `${ready}${bhk}${noun} ${verb} in ${city || 'India'}`.replace(/\s+/g, ' ').trim()
}

export function formatPriceShort(n) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1).replace(/\.0$/, '')} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

const FILTER_KEYS = ['purpose', 'city', 'type', 'beds', 'possession']

/**
 * Canonical /listings URL for a set of filters — fixed key order and
 * encodeURIComponent so the same filter combination always maps to one URL
 * (also used by the sitemap generator, which mirrors this logic).
 */
export function listingsPath(filters = {}, page = 1) {
  const parts = FILTER_KEYS.filter((k) => filters[k]).map((k) => `${k}=${encodeURIComponent(filters[k])}`)
  if (page > 1) parts.push(`page=${page}`)
  return `/listings${parts.length ? `?${parts.join('&')}` : ''}`
}
