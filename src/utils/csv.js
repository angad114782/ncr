import Papa from 'papaparse'

export const PROPERTY_CSV_COLUMNS = [
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
  'postedDate',
  'images',
  'floorPlans',
  'amenities',
  'nearby',
  'description',
]

function propertyToRow(p) {
  return {
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
    postedDate: p.postedDate,
    images: (p.images ?? []).join(';'),
    floorPlans: (p.floorPlans ?? []).join(';'),
    amenities: (p.amenities ?? []).join(';'),
    nearby: (p.nearby ?? []).map((n) => `${n.type}:${n.name}:${n.distance}`).join(';'),
    description: p.description,
  }
}

export function buildPropertyTemplateCsv(buySample, rentSample) {
  const rows = [propertyToRow(buySample), propertyToRow(rentSample)]
  return Papa.unparse({ fields: PROPERTY_CSV_COLUMNS, data: rows })
}

export function propertiesToCsv(properties) {
  const rows = properties.map(propertyToRow)
  return Papa.unparse({ fields: PROPERTY_CSV_COLUMNS, data: rows })
}

function toBool(v) {
  if (typeof v === 'boolean') return v
  return String(v ?? '').trim().toLowerCase() === 'true'
}

function toNumber(v, fallback = 0) {
  const n = Number(v)
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
    if (!row.title || !row.city || !row.price) {
      errors.push(`Row ${rowNum}: missing required field (title, city, or price) — skipped`)
      return
    }
    if (row.purpose !== 'Buy' && row.purpose !== 'Rent') {
      errors.push(`Row ${rowNum}: purpose must be "Buy" or "Rent" — skipped`)
      return
    }

    properties.push({
      title: row.title.trim(),
      type: row.type?.trim() || 'Apartment',
      purpose: row.purpose,
      price: toNumber(row.price),
      priceLabel: row.priceLabel?.trim() || `₹${toNumber(row.price).toLocaleString('en-IN')}`,
      city: row.city.trim(),
      locality: row.locality?.trim() || '',
      address: row.address?.trim() || '',
      lat: row.lat ? toNumber(row.lat, null) : null,
      lng: row.lng ? toNumber(row.lng, null) : null,
      beds: toNumber(row.beds, 0),
      baths: toNumber(row.baths, 0),
      areaSqft: toNumber(row.areaSqft, 0),
      furnishing: row.furnishing?.trim() || 'Unfurnished',
      yearBuilt: toNumber(row.yearBuilt, new Date().getFullYear()),
      agentId: row.agentId?.trim() || '',
      featured: toBool(row.featured),
      verified: toBool(row.verified),
      active: row.active === undefined || row.active === '' ? true : toBool(row.active),
      reraId: row.reraId?.trim() || null,
      possessionStatus: row.possessionStatus?.trim() || 'Ready to Move',
      videoTour: toBool(row.videoTour),
      postedDate: row.postedDate?.trim() || new Date().toISOString().slice(0, 10),
      images: row.images ? row.images.split(';').map((s) => s.trim()).filter(Boolean) : [],
      floorPlans: row.floorPlans ? row.floorPlans.split(';').map((s) => s.trim()).filter(Boolean) : [],
      amenities: row.amenities ? row.amenities.split(';').map((s) => s.trim()).filter(Boolean) : [],
      nearby: row.nearby
        ? row.nearby
            .split(';')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((entry) => {
              const [type, name, distance] = entry.split(':')
              return { type: type?.trim(), name: name?.trim(), distance: distance?.trim() }
            })
        : [],
      description: row.description?.trim() || '',
    })
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
