import Papa from 'papaparse'
import { isDataUrl, isImageLink } from './images'
import { capitaliseListing, cleanConfigurations, cleanFaqs } from './listingText'

export const PROPERTY_CSV_COLUMNS = [
  'id',
  'slug',
  'title',
  'type',
  'purpose',
  'price',
  'priceLabel',
  'city',
  'locality',
  'address',
  'lat',
  'lng',
  'beds',
  'baths',
  'areaSqft',
  'furnishing',
  'yearBuilt',
  'agentId',
  'featured',
  'verified',
  'active',
  'reraId',
  'possessionStatus',
  'videoTour',
  'videoUrl',
  'postedDate',
  'images',
  'floorPlans',
  'amenities',
  'nearby',
  'configurations',
  'faqs',
  'description',
]

// CSV carries image LINKS only — images uploaded in the admin (data URLs) are left out.
const linksOnly = (list) => (list ?? []).filter((u) => !isDataUrl(u))

function propertyToRow(p) {
  return {
    id: p.id,
    slug: p.slug ?? '',
    title: p.title,
    type: p.type,
    purpose: p.purpose,
    price: p.price,
    priceLabel: p.priceLabel,
    city: p.city,
    locality: p.locality,
    address: p.address,
    lat: p.lat,
    lng: p.lng,
    beds: p.beds,
    baths: p.baths,
    areaSqft: p.areaSqft,
    furnishing: p.furnishing,
    yearBuilt: p.yearBuilt,
    agentId: p.agentId,
    featured: p.featured,
    verified: p.verified,
    active: p.active !== false,
    reraId: p.reraId ?? '',
    possessionStatus: p.possessionStatus,
    videoTour: p.videoTour,
    videoUrl: p.videoUrl ?? '',
    postedDate: p.postedDate,
    images: linksOnly(p.images).join(';'),
    floorPlans: linksOnly(p.floorPlans).join(';'),
    amenities: (p.amenities ?? []).join(';'),
    nearby: (p.nearby ?? []).map((n) => `${n.type}:${n.name}:${n.distance}${n.lat != null && n.lng != null ? `:${n.lat}:${n.lng}` : ''}`).join(';'),
    configurations: (p.configurations ?? []).map((c) => `${c.beds}:${c.areaSqft || ''}:${c.price || ''}${c.baths ? `:${c.baths}` : ''}`).join(';'),
    faqs: (p.faqs ?? []).map((f) => `${f.question}||${f.answer}`).join('##'),
    description: p.description,
  }
}

export function buildPropertyTemplateCsv(buySample, rentSample) {
  // Blank ids: importing the template adds new listings instead of overwriting p1 / p2.
  const rows = [propertyToRow(buySample), propertyToRow(rentSample)].map((r) => ({ ...r, id: '', slug: '' }))
  // Show the multi-size and FAQ formats on the first example row.
  rows[0].configurations = '2:1100:8500000;3:1550:11500000;4:2100:16000000'
  rows[0].faqs = 'Is the project RERA registered?||Yes — the RERA number is shown on the listing.##Is a home loan available?||Yes, major banks approve loans for this project.'
  return Papa.unparse({ fields: PROPERTY_CSV_COLUMNS, data: rows })
}

export function propertiesToCsv(properties) {
  const rows = properties.map(propertyToRow)
  const skipped = properties.reduce((n, p) => n + (p.images ?? []).filter(isDataUrl).length + (p.floorPlans ?? []).filter(isDataUrl).length, 0)
  return { csv: Papa.unparse({ fields: PROPERTY_CSV_COLUMNS, data: rows }), skipped }
}

function toBool(v) {
  if (typeof v === 'boolean') return v
  return String(v ?? '').trim().toLowerCase() === 'true'
}

function toNumber(v, fallback = 0) {
  // `Number('')` is 0, not NaN — a blank CSV cell must fall back, not silently become a real (wrong) 0.
  // This bit for real: 92 rows with an empty yearBuilt column all came out as "year 0" instead of falling
  // back to the current year, failing the backend's 1800-2100 range check on every single row.
  const s = String(v ?? '').trim()
  if (!s) return fallback
  const n = Number(s)
  return Number.isFinite(n) ? n : fallback
}

/**
 * Parses an uploaded property CSV (matching PROPERTY_CSV_COLUMNS) into
 * property objects ready for addProperty/addProperties. Returns
 * { properties, errors } — errors are row-level, parsing continues past them.
 */
export function parsePropertyCsv(csvText) {
  const { data, errors: parseErrors } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  const errors = parseErrors.map((e) => `Row ${e.row + 2}: ${e.message}`)
  const properties = []

  data.forEach((row, i) => {
    const rowNum = i + 2 // +1 for header, +1 for 1-indexing
    // configurations: "2:1200:8500000:2;3:1600:11500000:3" = BHK:area sq.ft:price[:bathrooms], one block per size
    const configurations = cleanConfigurations(
      (row.configurations ?? '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((entry) => {
          const [beds, areaSqft, price, baths] = entry.split(':')
          return { beds, areaSqft, price, baths }
        }),
    )
    // faqs: "Question one?||Answer one.##Question two?||Answer two."
    const faqs = cleanFaqs(
      (row.faqs ?? '')
        .split('##')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((entry) => {
          const [question, ...answer] = entry.split('||')
          return { question: question?.trim(), answer: answer.join('||').trim() }
        }),
    )
    const startPrice = Math.min(...configurations.filter((c) => c.price > 0).map((c) => c.price))
    const price = row.price ? toNumber(row.price) : Number.isFinite(startPrice) ? startPrice : 0
    if (!row.title || !row.city || !price) {
      errors.push(`Row ${rowNum}: missing required field (title, city, and a price — or BHK configurations with prices) — skipped`)
      return
    }
    if (row.purpose !== 'Buy' && row.purpose !== 'Rent') {
      errors.push(`Row ${rowNum}: purpose must be "Buy" or "Rent" — skipped`)
      return
    }

    const images = row.images ? row.images.split(';').map((x) => x.trim()).filter(Boolean) : []
    const floorPlans = row.floorPlans ? row.floorPlans.split(';').map((x) => x.trim()).filter(Boolean) : []
    const badLink = [...images, ...floorPlans].find((u) => !isImageLink(u))
    if (badLink) {
      errors.push(`Row ${rowNum}: image "${badLink.slice(0, 40)}" must be a link (http(s):// or /path) — skipped`)
      return
    }

    const smallest = configurations[0]
    properties.push(capitaliseListing({
      ...(row.id?.trim() ? { id: row.id.trim() } : {}),
      ...(row.slug?.trim() ? { slug: row.slug.trim() } : {}), // blank = generated from the title
      title: row.title.trim(),
      type: row.type?.trim() || 'Apartment',
      purpose: row.purpose,
      price,
      priceLabel: row.priceLabel?.trim() || `${configurations.length > 1 ? 'From ' : ''}₹${price.toLocaleString('en-IN')}`,
      city: row.city.trim(),
      locality: row.locality?.trim() || '',
      address: row.address?.trim() || '',
      lat: row.lat ? toNumber(row.lat, null) : null,
      lng: row.lng ? toNumber(row.lng, null) : null,
      beds: smallest ? smallest.beds : toNumber(row.beds, 0),
      baths: toNumber(row.baths, 0),
      areaSqft: smallest?.areaSqft || toNumber(row.areaSqft, 0),
      configurations,
      faqs,
      furnishing: row.furnishing?.trim() || 'Unfurnished',
      yearBuilt: toNumber(row.yearBuilt, new Date().getFullYear()),
      agentId: row.agentId?.trim() || '',
      featured: toBool(row.featured),
      verified: toBool(row.verified),
      active: row.active === undefined || row.active === '' ? true : toBool(row.active),
      reraId: row.reraId?.trim() || null,
      possessionStatus: row.possessionStatus?.trim() || 'Ready to Move',
      videoTour: toBool(row.videoTour),
      videoUrl: row.videoUrl?.trim() || '',
      postedDate: row.postedDate?.trim() || new Date().toISOString().slice(0, 10),
      images,
      floorPlans,
      amenities: row.amenities ? row.amenities.split(';').map((s) => s.trim()).filter(Boolean) : [],
      nearby: row.nearby
        ? row.nearby
            .split(';')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((entry) => {
              const [type, name, distance, lat, lng] = entry.split(':')
              return { type: type?.trim(), name: name?.trim(), distance: distance?.trim(), lat: lat?.trim() || null, lng: lng?.trim() || null }
            })
        : [],
      description: row.description?.trim() || '',
    }))
  })

  return { properties, errors }
}

export function inquiriesToCsv(inquiries, properties) {
  const rows = inquiries.map((i) => ({
    id: i.id,
    date: i.date,
    status: i.status,
    propertyId: i.propertyId,
    propertyTitle: properties.find((p) => p.id === i.propertyId)?.title ?? '',
    userId: i.userId ?? '',
    userName: i.userName,
    userEmail: i.userEmail ?? '',
    phone: i.phone ?? '',
    phoneVerified: i.phoneVerified ?? false,
    budget: i.budget ?? '',
    source: i.source ?? '',
    intent: i.intent ?? '',
    interest: i.interest?.line ?? '',
    consent: i.consent ?? '',
    message: i.message,
  }))
  return Papa.unparse(rows)
}

export function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
