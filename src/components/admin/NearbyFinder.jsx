import { useState } from 'react'
import { Loader2, MapPinned } from 'lucide-react'
import GlassButton from '../glass/GlassButton'
import { useSettings } from '../../context/SettingsContext'
import { useGoogleMaps } from '../../utils/googleMaps'
import { distanceLabel } from '../../utils/geo'

// What "Nearby places" lists, and the Google place types that stand for each.
const KINDS = [
  { type: 'School', types: ['school'], radius: 4000 },
  { type: 'Hospital', types: ['hospital'], radius: 6000 },
  { type: 'Metro', types: ['subway_station', 'light_rail_station'], radius: 10000 },
  { type: 'Mall', types: ['shopping_mall'], radius: 8000 },
]
const PER_KIND = 2

/**
 * "Find nearby places": asks Google Places for the closest schools, hospitals, metro stations and malls around the
 * listing's pin and adds them — with their real positions, so the website draws them in the right place. Existing
 * entries are kept; the admin can still edit or delete any of them below.
 */
export default function NearbyFinder({ item, setItem }) {
  const { marketingConfig } = useSettings()
  const google = useGoogleMaps(marketingConfig?.googleMapsApiKey)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const lat = Number(item.lat)
  const lng = Number(item.lng)
  const hasPin = item.lat !== '' && item.lat !== null && item.lng !== '' && item.lng !== null && Number.isFinite(lat) && Number.isFinite(lng)

  const find = async () => {
    setBusy(true)
    setNote('')
    try {
      const { Place, SearchNearbyRankPreference } = window.google.maps.places
      const found = []
      for (const kind of KINDS) {
        const { places } = await Place.searchNearby({
          fields: ['displayName', 'location'],
          locationRestriction: { center: { lat, lng }, radius: kind.radius },
          includedPrimaryTypes: kind.types,
          maxResultCount: PER_KIND + 3,
          rankPreference: SearchNearbyRankPreference.DISTANCE,
        })
        places.slice(0, PER_KIND).forEach((p) => {
          const pLat = p.location.lat()
          const pLng = p.location.lng()
          found.push({ type: kind.type, name: p.displayName, distance: distanceLabel(lat, lng, pLat, pLng), lat: Math.round(pLat * 1e6) / 1e6, lng: Math.round(pLng * 1e6) / 1e6 })
        })
      }
      const have = new Set((item.nearby ?? []).map((n) => `${n.type}|${String(n.name).toLowerCase()}`))
      const fresh = found.filter((n) => !have.has(`${n.type}|${String(n.name).toLowerCase()}`))
      setItem({ ...item, nearby: [...(item.nearby ?? []), ...fresh] })
      setNote(fresh.length ? `Added ${fresh.length} place${fresh.length === 1 ? '' : 's'} — review them below.` : found.length ? 'Those places are already in the list.' : 'Google found nothing nearby — add places by hand below.')
    } catch (err) {
      setNote(`Could not search nearby places (${err?.message ?? 'error'}). Check that “Places API (New)” is enabled for the Google key.`)
    } finally {
      setBusy(false)
    }
  }

  const blocked = google !== 'ready' ? (google === 'off' ? 'Add a Google Maps API key in Admin → Settings → Tracking to find nearby places automatically.' : google === 'error' ? 'The Google Maps key was refused — fix it in Admin → Settings → Tracking.' : 'Loading Google Maps…') : !hasPin ? 'Place the pin on the map above first.' : ''

  return (
    <div className="glass-weak rounded-[16px] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">Nearby places</p>
        <p className="text-tertiary text-xs">{blocked || 'Finds the closest schools, hospitals, metro stations and malls around the pin, with their real positions.'}</p>
        {note && <p className="text-xs mt-1 text-secondary">{note}</p>}
      </div>
      <GlassButton type="button" variant="glass" size="sm" onClick={find} disabled={busy || Boolean(blocked)}>
        {busy ? <Loader2 size={14} className="animate-spin" /> : <MapPinned size={14} />} Find with Google
      </GlassButton>
    </div>
  )
}
