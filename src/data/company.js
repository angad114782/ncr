// Single source of truth for company / leadership facts used by About, Team,
// Contact, Footer and structured data (JSON-LD).
//
// Only facts confirmed by the owner are filled in. Everything else is left
// empty on purpose and is HIDDEN on the site until it is filled — never
// invent an address, founding year, licence number or credential here, since
// Google (E-E-A-T) and Indian advertising / RERA rules both expect real ones.

export const COMPANY = {
  name: 'NCR Estates',
  domain: 'propertyinncr.com',
  tagline: 'Verified homes to buy or rent across India',

  // TODO(owner): fill these in — sections that use them stay hidden until then.
  foundedYear: null, // e.g. 2021
  reraAgentId: '', // your state RERA real-estate-agent registration number
  address: { street: '', locality: '', city: '', region: '', postalCode: '' },
  officeHours: '', // e.g. 'Mon–Sat, 10:00 AM – 7:00 PM'
  social: { facebook: '', instagram: '', linkedin: '', youtube: '' },

  // The bundled testimonials are sample data (made-up names, stock photos).
  // Publishing fake reviews breaches Indian consumer-protection rules and hurts
  // trust, so they are hidden. Replace src/data/testimonials.json with real,
  // consented client reviews, then set this to true.
  showTestimonials: false,

  ceo: {
    name: 'Angad Yadav',
    title: 'CEO',
    experienceYears: 5,
    // No stock photo on purpose — a real person needs a real photo. Put a file
    // in /public (e.g. '/angad-yadav.jpg') and set it here to show it.
    photo: '',
    summary:
      'Angad Yadav is the CEO of NCR Estates. With 5+ years of hands-on experience in the real estate market, he has worked closely with home buyers, tenants and property owners — and built NCR Estates around one idea: property search should be transparent, verified and free of pressure.',
    // Draft copy based only on the facts supplied — edit to match reality.
    expertise: [
      'Residential buying & selling',
      'Rentals',
      'Property documentation guidance',
      'Home-loan & budget planning',
    ],
    quote:
      'A good property decision starts with honest information — the real price, the real paperwork and the real trade-offs.',
  },
}

export function formatAddress(address = COMPANY.address) {
  return [address.street, address.locality, address.city, address.region, address.postalCode]
    .filter(Boolean)
    .join(', ')
}

export function hasAddress(address = COMPANY.address) {
  return Boolean(address.street || address.locality || address.city)
}
