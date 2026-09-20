// DEFAULT company / leadership facts. The live values are edited by the admin
// (Admin → Site Content → Company & Leadership) and read through useCompany().
//
// Only facts confirmed by the owner are pre-filled. Everything else stays empty
// and is HIDDEN on the site until filled — never invent an address, founding
// year, licence number or credential (Google E-E-A-T and Indian advertising /
// RERA rules both expect real ones).

export const COMPANY_DEFAULTS = {
  name: 'NCR Estates',
  domain: 'propertyinncr.com',
  tagline: 'Verified homes to buy or rent across India',

  foundedYear: null, // e.g. 2021
  reraAgentId: '', // state RERA real-estate-agent registration number
  address: { street: '', locality: '', city: '', region: '', postalCode: '' },
  officeHours: '', // e.g. 'Mon–Sat, 10:00 AM – 7:00 PM'
  social: { facebook: '', instagram: '', linkedin: '', youtube: '' },

  ceo: {
    name: 'Angad Yadav',
    title: 'CEO',
    experienceYears: 5,
    // No stock photo on purpose — a real person needs a real photo. Upload one
    // (or paste a link) in Admin → Site Content.
    photo: '',
    summary:
      'Angad Yadav is the CEO of NCR Estates. With 5+ years of hands-on experience in the real estate market, he has worked closely with home buyers, tenants and property owners — and built NCR Estates around one idea: property search should be transparent, verified and free of pressure.',
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

export function formatAddress(address = {}) {
  return [address.street, address.locality, address.city, address.region, address.postalCode]
    .filter(Boolean)
    .join(', ')
}

export function hasAddress(address = {}) {
  return Boolean(address.street || address.locality || address.city)
}
