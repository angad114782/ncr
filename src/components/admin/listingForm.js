// The listing editor's fields, defaults and normalisation — shared by the admin's Listings screen
// and the agent panel's "My listings", so an agent fills in exactly the same form.
import { createElement } from 'react'
import { newId } from '../../utils/ids'
import { formatPriceShort } from '../../utils/seo'
import { capitaliseListing, cleanConfigurations, cleanFaqs } from '../../utils/listingText'
import LocationPicker from './LocationPicker'

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
    { key: 'price', label: 'Price (₹)', type: 'number', min: 0, step: 1, hint: 'Full amount in rupees — used for sorting, filters and EMI. Rent = per month. Leave blank if you list several BHK sizes below (the lowest price is used).' },
    { key: 'priceLabel', label: 'Price label', placeholder: 'auto e.g. ₹2.15 Cr', hint: 'Leave blank to generate from the price.' },
    { key: 'beds', label: 'Bedrooms (BHK)', type: 'number', min: 0, step: 1, hint: 'For a project with several sizes (2, 3, 4 BHK…) add them under “BHK configurations” below instead.' },
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
    {
      key: 'location',
      type: 'custom',
      render: ({ item, setItem }) =>
        createElement(LocationPicker, {
          lat: item.lat,
          lng: item.lng,
          hint: [item.locality, item.city].filter(Boolean).join(', '),
          onChange: (lat, lng) => setItem({ ...item, lat, lng }),
        }),
    },
    { key: 'lat', label: 'Latitude', type: 'number', step: 'any', hint: 'Filled by the map above — needed for the map and distance-to-hubs.' },
    { key: 'lng', label: 'Longitude', type: 'number', step: 'any' },
    {
      key: 'configurations',
      label: 'BHK configurations',
      type: 'objectList',
      addLabel: 'Add BHK size',
      max: 12,
      hint: 'For a project sold in several sizes — each row is one BHK with its own area and price.',
      itemTitle: (c, i) => (c.beds ? `${c.beds} BHK` : `Size ${i + 1}`),
      // The first size added to a single-size listing keeps that listing's own BHK / area / price as row one
      // (nothing is lost), then a new row for the next free BHK size (3 after 2, …).
      addItems: (list = [], item = {}) => {
        const next = { beds: Math.min(6, Math.max(1, ...list.map((c) => Number(c.beds) || 0), Number(item.beds) || 0) + 1), areaSqft: '', price: '' }
        const own = !list.length && Number(item.beds) > 0 && Number(item.price) > 0 ? [{ beds: Number(item.beds), areaSqft: Number(item.areaSqft) || '', price: Number(item.price) }] : []
        return own.length ? [...own, next] : list.length ? [next] : [{ ...next, beds: Math.max(1, Number(item.beds) || 2) }]
      },
      fields: [
        { key: 'beds', label: 'BHK', type: 'select', options: [1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: `${n} BHK` })) },
        { key: 'areaSqft', label: 'Area (sq.ft)', type: 'number', min: 0, step: 1 },
        { key: 'price', label: 'Price (₹)', type: 'number', min: 0, step: 1 },
      ],
    },
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
    {
      key: 'faqs',
      label: 'FAQs',
      type: 'objectList',
      addLabel: 'Add question',
      max: 30,
      itemTitle: (f, i) => f.question || `Question ${i + 1}`,
      newItem: () => ({ question: '', answer: '' }),
      fields: [
        { key: 'question', label: 'Question', half: false },
        { key: 'answer', label: 'Answer', type: 'textarea', rows: 3 },
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
    images: [], floorPlans: [], videoUrl: '', amenities: [], nearby: [], configurations: [], faqs: [], featured: false, verified: false, videoTour: false, active: true,
  }
}

/**
 * Normalises numbers / labels / capitalisation before a listing is saved. A listing with BHK configurations takes
 * its headline beds / area / price from the smallest one (the server applies the same rule).
 */
export function prepareListing(p) {
  const configurations = cleanConfigurations(p.configurations)
  const priced = configurations.filter((c) => c.price > 0)
  const lowest = priced.length ? priced.reduce((a, c) => (c.price < a.price ? c : a)) : configurations[0]
  const price = priced.length ? lowest.price : Number(p.price) || 0
  const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v))
  return {
    ...capitaliseListing(p),
    price,
    // with BHK sizes the label always follows the lowest price (a hand-typed one would go stale); otherwise a typed label wins
    priceLabel: (!priced.length && p.priceLabel?.trim()) || `${priced.length > 1 ? 'From ' : ''}${formatPriceShort(price)}${p.purpose === 'Rent' ? '/mo' : ''}`,
    beds: lowest ? lowest.beds : Number(p.beds) || 0,
    baths: Number(p.baths) || 0,
    areaSqft: lowest?.areaSqft || Number(p.areaSqft) || 0,
    configurations,
    faqs: cleanFaqs(p.faqs),
    yearBuilt: Number(p.yearBuilt) || new Date().getFullYear(),
    lat: num(p.lat),
    lng: num(p.lng),
    reraId: p.reraId?.trim() || null,
    postedDate: p.postedDate || today(),
    videoTour: !!p.videoTour || !!p.videoUrl,
  }
}

/** A listing needs a price of its own, or (a project in several sizes) a price on at least one BHK size. */
export const hasPrice = (p) => Number(p.price) > 0 || (p.configurations ?? []).some((c) => Number(c?.price) > 0)

/** Listings an agent posted wait here until the admin approves them (`reviewStatus` missing = approved). */
export const reviewOf = (p) => p.reviewStatus ?? 'approved'
