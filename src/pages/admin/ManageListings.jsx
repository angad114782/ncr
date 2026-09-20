import { ExternalLink, Star } from 'lucide-react'
import CollectionAdmin from '../../components/admin/CollectionAdmin'
import { useData } from '../../context/DataContext'
import { useSettings } from '../../context/SettingsContext'
import { buildPropertyTemplateCsv, parsePropertyCsv, propertiesToCsv } from '../../utils/csv'
import { isDataUrl } from '../../utils/images'
import { newId } from '../../utils/ids'
import { formatPriceShort } from '../../utils/seo'
import propertiesSeed from '../../data/properties.json'

const NEARBY_TYPES = ['School', 'Hospital', 'Metro', 'Mall']
const today = () => new Date().toISOString().slice(0, 10)

// CSV carries image LINKS only. When a CSV row updates an existing listing, images that
// were uploaded in the admin (which a CSV can't hold) are kept instead of being wiped.
const keepUploads = (list = [], prev = []) => [...list, ...prev.filter(isDataUrl)]

const propertyCsv = {
  entity: 'listings',
  filename: 'properties',
  keyHelp: 'Rows whose id matches an existing listing update it; others are added. Images / floorPlans are links separated by ";". nearby = Type:Name:Distance;… (uploaded images can’t be exported).',
  toCsv: propertiesToCsv,
  template: (seed) => buildPropertyTemplateCsv(seed.find((p) => p.id === 'p1'), seed.find((p) => p.id === 'p2')),
  parse(text, existing) {
    const { properties, errors } = parsePropertyCsv(text)
    const byId = new Map(existing.map((p) => [p.id, p]))
    const items = properties.map((p) => {
      const prev = p.id ? byId.get(p.id) : undefined
      return {
        ...(prev ?? {}),
        ...p,
        id: prev?.id ?? newId('p'),
        images: keepUploads(p.images, prev?.images),
        floorPlans: keepUploads(p.floorPlans, prev?.floorPlans),
      }
    })
    return { items, errors }
  },
}

export default function ManageListings() {
  const { properties, agents, propertyCrud, restoreSeeds } = useData()
  const { cities, propertyTypes, siteContent } = useSettings()
  const { possession, furnishing } = siteContent.options

  const schema = [
    { key: 'title', label: 'Title', required: true, half: false, placeholder: 'e.g. Sea-Facing 3BHK Apartment' },
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
    { key: 'agentId', label: 'Listing agent', type: 'select', allowEmpty: true, emptyLabel: '— none —', options: agents.map((a) => ({ value: a.id, label: `${a.name}${a.city ? ` (${a.city})` : ''}` })) },
    { key: 'postedDate', label: 'Posted on', type: 'date' },
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
    { key: 'featured', label: 'Featured', type: 'toggle', half: true },
    { key: 'verified', label: 'Verified badge', type: 'toggle', half: true },
    { key: 'videoTour', label: 'Show “Video Tour” badge', type: 'toggle', half: true },
    { key: 'active', label: 'Active (visible on the website)', type: 'toggle', half: true },
  ]

  const emptyItem = () => ({
    id: newId('p'), title: '', purpose: 'Buy', type: propertyTypes[0] ?? 'Apartment', city: '', locality: '', address: '',
    price: '', priceLabel: '', beds: 2, baths: 2, areaSqft: 1000, furnishing: furnishing[0] ?? '', possessionStatus: possession[0] ?? '',
    yearBuilt: new Date().getFullYear(), reraId: '', agentId: '', postedDate: today(), lat: '', lng: '', description: '',
    images: [], floorPlans: [], videoUrl: '', amenities: [], nearby: [], featured: false, verified: false, videoTour: false, active: true,
  })

  const prepare = (p) => {
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

  return (
    <CollectionAdmin
      title="Listings"
      singular="listing"
      items={properties}
      crud={propertyCrud}
      schema={schema}
      csv={{ config: propertyCsv, seedItems: propertiesSeed }}
      restore={() => restoreSeeds('properties')}
      emptyItem={emptyItem}
      prepare={prepare}
      validate={(p) => (Number(p.price) > 0 ? '' : 'Enter the price in rupees (greater than 0).')}
      duplicate={(p) => ({ ...p, id: newId('p'), title: `${p.title} (copy)`, active: false, featured: false })}
      searchText={(p) => `${p.title} ${p.city} ${p.locality} ${p.type} ${p.purpose}`}
      rowExtras={(p) => p.active !== false && (
        <a href={`/property/${p.id}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${p.title} on the website`} className="glass w-8 h-8 rounded-full flex items-center justify-center"><ExternalLink size={13} /></a>
      )}
      columns={[
        {
          label: 'Property',
          className: 'min-w-[260px]',
          render: (p) => (
            <div className="flex items-center gap-3">
              {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-14 h-10 rounded-[10px] object-cover shrink-0" /> : <span className="w-14 h-10 rounded-[10px] glass-weak shrink-0" />}
              <div className="min-w-0">
                <p className="font-medium line-clamp-1">{p.title}{p.featured && <Star size={12} className="inline ml-1.5 -mt-0.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />}</p>
                <p className="text-tertiary text-xs truncate">{[p.locality, p.city].filter(Boolean).join(', ')}</p>
              </div>
            </div>
          ),
        },
        { label: 'Purpose', render: (p) => <span className="glass-weak px-2.5 py-1 rounded-full text-xs">{p.purpose}</span> },
        { label: 'Price', render: (p) => <span className="font-medium whitespace-nowrap">{p.priceLabel}</span> },
      ]}
    />
  )
}
