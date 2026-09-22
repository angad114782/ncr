import { formatAddress, hasAddress } from '../data/company'

export const SITE_URL = 'https://propertyinncr.com'

/** Uploaded (data:) images can't be fetched by crawlers — never put them in meta tags / JSON-LD. */
export const crawlableImage = (src) => (src && !String(src).startsWith('data:') ? src : undefined)

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

export function personLd(company) {
  const { ceo } = company
  const photo = crawlableImage(ceo.photo)
  return {
    '@type': 'Person',
    '@id': `${SITE_URL}/team#${ceo.name.toLowerCase().replace(/\s+/g, '-')}`,
    name: ceo.name,
    jobTitle: ceo.title,
    url: `${SITE_URL}/team`,
    worksFor: { '@type': 'Organization', name: company.name, url: SITE_URL },
    knowsAbout: ceo.expertise,
    ...(photo ? { image: photo.startsWith('http') ? photo : `${SITE_URL}${photo}` } : {}),
  }
}

export function organizationLd({ company, phone, email, cities = [] }) {
  const sameAs = Object.values(company.social ?? {}).filter(Boolean)
  return {
    '@type': 'RealEstateAgent',
    '@id': `${SITE_URL}/#organization`,
    name: company.name,
    url: SITE_URL,
    description: company.tagline,
    ...(phone ? { telephone: `+91${phone}` } : {}),
    ...(email ? { email } : {}),
    ...(cities.length ? { areaServed: cities.map((c) => ({ '@type': 'City', name: c })) } : {}),
    ...(company.foundedYear ? { foundingDate: String(company.foundedYear) } : {}),
    founder: personLd(company),
    ...(hasAddress(company.address)
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: company.address.street,
            addressLocality: company.address.city || company.address.locality,
            addressRegion: company.address.region,
            postalCode: company.address.postalCode,
            addressCountry: 'IN',
          },
        }
      : {}),
    ...(company.officeHours ? { openingHours: company.officeHours } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  }
}

export { formatAddress, hasAddress }

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

export { formatPriceShort } from './format.js'

// Clean listing URLs live in a dependency-free module shared with the build scripts.
export { cityAliasesOf, listingsPath, resolveListingsSegments, slugify } from './listingsUrl.js'
export { propertyPath } from './propertySlug.js'
