// The listing editor's fields, defaults and normalisation — shared by the admin's Listings screen
// and the agent panel's "My listings", so an agent fills in exactly the same form.
import { newId } from '../../utils/ids'
import { formatPriceShort } from '../../utils/seo'

const NEARBY_TYPES = ['School', 'Hospital', 'Metro', 'Mall']
export const today = () => new Date().toISOString().slice(0, 10)

/**
 * mode 'admin': every field, incl. featured / verified / active / listing agent / review status.
 * mode 'agent': only what an agent may set. Featured, Verified, Active, the listing agent and the
 *               review status are controlled by the admin (see agentListingGuard).
 */
export function listingFields({ cities, propertyTypes, furnishing, possession, agents = [], mode = 'admin' }) {
  const admin = mode === 'admin'
  return [
    { key: 'title', label: 'Title', required: true, half: false, placeholder: 'e.g. Sea-Facing 3BHK Apartment' },
    ...(admin
      ? [{ key: 'slug', label: 'URL slug', half: false, placeholder: 'auto-generated from the title', hint: 'Becomes /property/your-slug. Leave it blank to generate it from the title — if that is taken, the city / locality / type is added. Changing it keeps the old link working (it redirects).' }]
      : []),
    { key: 'purpose', label: 'Purpose', type: 'select', options: ['Buy', 'Rent'] },
    { key: 'type', label: 'Property type', type: 'select', options: propertyTypes },
    { key: 'city', label: 'City', type: 'select', required: true, options: cities, allowEmpty: true, emptyLabel: 'Select city…' },
    { key: 'locality', label: 'Locality / sector', placeholder: 'Bandra West' },
    { key: 'address', label: 'Full address', half: false },
    { key: 'price', label: 'Price (₹)', type: 'number', required: true, min: 0, step: 1, hint: 'Full amount in rupees — used for sorting, filters and EMI. Rent = per month.' },
    { key: 'priceLabel', label: 'Price label', placeholder: 'auto e.g. ₹2.15 Cr', hint: 'Leave blank to generate from the price.' },
    { key: 'beds', label: 'Bedrooms', type: 'number', min: 0, step: 1 },
    { key: 'baths', label: 'Bathrooms', type: 'number', min: 0, step: 1 },
    { key: 'areaSqft', label: 'Area (sq.ft)', type: 'number', min: 0, step: 1 },
    { key: 'furnishing', label: 'Furnishing', type: 'select', options: furnishing },
    { key: 'possessionStatus', label: 'Possession', type: 'select', options: possession },
    { key: 'yearBuilt', label: 'Year built', type: 'number', step: 1 },
    { key: 'reraId', label: 'RERA registration no.', placeholder: 'Leave blank if not applicable', hint: 'Shown on the listing — enter only a real, verifiable number.' },
    ...(admin
      ? [
          { key: 'agentId', label: 'Listing agent', type: 'select', allowEmpty: true, emptyLabel: '— none —', options: agents.map((a) => ({ value: a.id, label: `${a.name}${a.city ? ` (${a.city})` : ''}` })) },
          { key: 'postedDate', label: 'Posted on', type: 'date' },
        ]
      : []),
    { key: 'lat', label: 'Latitude', type: 'number', step: 'any', hint: 'Needed for the map and distance-to-hubs.' },
    { key: 'lng', label: 'Longitude', type: 'number', step: 'any' },
    { key: 'description', label: 'Description', type: 'textarea', rows: 5 },
    { key: 'images', label: 'Photos', type: 'imageList', max: 15, hint: 'First photo is the cover. Choose files from your device or paste links.' },
    { key: 'floorPlans', label: 'Floor plans', type: 'imageList', max: 5 },
    { key: 'videoUrl', label: 'Video tour link (YouTube / Vimeo)', type: 'url', half: false, placeholder: 'https://…' },
    { key: 'amenities', label: 'Amenities', type: 'stringList', placeholder: 'e.g. Swimming Pool' },
    {
      key: 'nearby',
      label: 'Nearby places',
      type: 'objectList',
      addLabel: 'Add place',
      itemTitle: (n, i) => n.name || `Place ${i + 1}`,
      newItem: () => ({ type: 'School', name: '', distance: '' }),
      fields: [
        { key: 'type', label: 'Type', type: 'select', options: NEARBY_TYPES },
        { key: 'name', label: 'Name' },
        { key: 'distance', label: 'Distance', placeholder: '1.2 km' },
      ],
    },
    ...(admin
      ? [
          { key: 'featured', label: 'Featured', type: 'toggle', half: true },
          { key: 'verified', label: 'Verified badge', type: 'toggle', half: true },
          { key: 'videoTour', label: 'Show “Video Tour” badge', type: 'toggle', half: true },
          { key: 'active', label: 'Active (visible on the website)', type: 'toggle', half: true },
          { key: 'reviewStatus', label: 'Review status', type: 'select', options: ['approved', 'pending', 'rejected'], hint: 'Listings posted by agents start as “pending”. Approving also makes them live.' },
          { key: 'reviewNote', label: 'Note to the agent (optional)', type: 'textarea', rows: 2, hint: 'Shown to the agent — e.g. why a listing was rejected.' },
        ]
      : []),
  ]
}

export function emptyListing({ propertyTypes, furnishing, possession }) {
  return {
    id: newId('p'), slug: '', title: '', purpose: 'Buy', type: propertyTypes[0] ?? 'Apartment', city: '', locality: '', address: '',
    price: '', priceLabel: '', beds: 2, baths: 2, areaSqft: 1000, furnishing: furnishing[0] ?? '', possessionStatus: possession[0] ?? '',
    yearBuilt: new Date().getFullYear(), reraId: '', agentId: '', postedDate: today(), lat: '', lng: '', description: '',
    images: [], floorPlans: [], videoUrl: '', amenities: [], nearby: [], featured: false, verified: false, videoTour: false, active: true,
  }
}

/** Normalises numbers / labels before a listing is saved. */
export function prepareListing(p) {
  const price = Number(p.price) || 0
  const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v))
  return {
    ...p,
    price,
    priceLabel: p.priceLabel?.trim() || `${formatPriceShort(price)}${p.purpose === 'Rent' ? '/mo' : ''}`,
    beds: Number(p.beds) || 0,
    baths: Number(p.baths) || 0,
    areaSqft: Number(p.areaSqft) || 0,
    yearBuilt: Number(p.yearBuilt) || new Date().getFullYear(),
    lat: num(p.lat),
    lng: num(p.lng),
    reraId: p.reraId?.trim() || null,
    postedDate: p.postedDate || today(),
    videoTour: !!p.videoTour || !!p.videoUrl,
    amenities: (p.amenities ?? []).map((a) => a.trim()).filter(Boolean),
    nearby: (p.nearby ?? []).filter((n) => n.name?.trim()),
  }
}

/** Listings an agent posted wait here until the admin approves them (`reviewStatus` missing = approved). */
export const reviewOf = (p) => p.reviewStatus ?? 'approved'
