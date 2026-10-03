import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { ExternalLink, Loader2, MapPin, Search } from 'lucide-react'
import GlassButton from '../glass/GlassButton'

// Pick a listing's location instead of typing latitude / longitude: search a place, click the map, drag the pin,
// or paste a Google Maps link / "lat, lng". No API key is needed (OpenStreetMap search + map tiles).

const INDIA_CENTRE = [28.5, 77.2] // NCR
const TILES = {
  streets: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap contributors' },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles © Esri' },
}

const pin = L.divIcon({
  html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#674E40;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.45);transform:rotate(-45deg)"></div>',
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
})

const inRange = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
const round = (n) => Math.round(n * 1e6) / 1e6

/** Pulls coordinates out of a Google Maps link, or "28.45, 77.02". Returns null when there are none (short links can't be read in a browser). */
export function parseLocation(text) {
  const s = decodeURIComponent(String(text ?? '')).trim()
  const patterns = [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /@(-?\d+\.\d+),(-?\d+\.\d+)/, /[?&](?:q|ll|query|center)=(-?\d+\.\d+)[, +]+(-?\d+\.\d+)/, /^\s*(-?\d+\.\d+)\s*[, ]\s*(-?\d+\.\d+)\s*$/]
  for (const re of patterns) {
    const m = s.match(re)
    if (m && inRange(Number(m[1]), Number(m[2]))) return { lat: Number(m[1]), lng: Number(m[2]) }
  }
  return null
}

function Clicks({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

function Fly({ point }) {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize()
      if (point) map.setView([point.lat, point.lng], Math.max(map.getZoom(), 15))
    }, 120)
    return () => clearTimeout(t)
  }, [map, point?.lat, point?.lng]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export default function LocationPicker({ lat, lng, hint = '', onChange }) {
  const point = inRange(Number(lat), Number(lng)) && lat !== '' && lat !== null && lng !== '' && lng !== null ? { lat: Number(lat), lng: Number(lng) } : null
  const [layer, setLayer] = useState('streets')
  const [query, setQuery] = useState('')
  const [paste, setPaste] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const reqId = useRef(0)

  const set = (la, ln) => {
    setNote('')
    onChange(round(la), round(ln))
  }

  const search = async () => {
    const q = (query || hint).trim()
    if (!q) return setNote('Type a place, society or area to search.')
    const id = ++reqId.current
    setBusy(true)
    setNote('')
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' } })
      const data = await res.json()
      if (id !== reqId.current) return
      setResults(data.map((r) => ({ name: r.display_name, lat: Number(r.lat), lng: Number(r.lon) })))
      if (!data.length) setNote('No place found — try a nearby landmark, or click the map.')
    } catch {
      if (id === reqId.current) setNote('Search is not available right now — click the map to place the pin instead.')
    } finally {
      if (id === reqId.current) setBusy(false)
    }
  }

  const applyPaste = (value) => {
    setPaste(value)
    if (!value.trim()) return
    const found = parseLocation(value)
    if (found) {
      set(found.lat, found.lng)
      setPaste('')
    } else if (/goo\.gl|maps\.app/i.test(value)) {
      setNote('Short Google links hide the position. Open it in your browser and paste the long address from the address bar, or right-click the spot in Google Maps and click the coordinates to copy them.')
    } else {
      setNote('Could not find coordinates in that. Paste a Google Maps link containing “@lat,lng”, or “28.4595, 77.0266”.')
    }
  }

  const tile = TILES[layer]
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-sm font-medium text-secondary px-1">Location on map</span>
      <div className="flex gap-2">
        <div className="flex-1 glass-weak rounded-[14px] px-4 h-11 flex items-center gap-2">
          <Search size={15} className="text-tertiary shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), search())}
            placeholder={hint ? `Search a place — e.g. ${hint}` : 'Search a place, society or area'}
            className="bg-transparent outline-none w-full text-[15px]"
            aria-label="Search a place"
          />
        </div>
        <GlassButton type="button" variant="glass" onClick={search} disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : 'Search'}
        </GlassButton>
      </div>

      {results.length > 0 && (
        <ul className="glass-weak rounded-[14px] overflow-hidden text-sm">
          {results.map((r) => (
            <li key={`${r.lat},${r.lng}`}>
              <button type="button" onClick={() => { set(r.lat, r.lng); setResults([]) }} className="w-full text-left px-4 py-2.5 hover:bg-white/10 flex gap-2 items-start">
                <MapPin size={14} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
                <span className="line-clamp-2">{r.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative rounded-[16px] overflow-hidden h-[280px] border border-[var(--glass-border)]">
        <MapContainer center={point ? [point.lat, point.lng] : INDIA_CENTRE} zoom={point ? 15 : 9} scrollWheelZoom className="h-full w-full">
          <TileLayer key={layer} url={tile.url} attribution={tile.attribution} />
          <Clicks onPick={set} />
          <Fly point={point} />
          {point && (
            <Marker
              position={[point.lat, point.lng]}
              icon={pin}
              draggable
              eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); set(p.lat, p.lng) } }}
            />
          )}
        </MapContainer>
        <div className="absolute top-2 right-2 z-[500] flex gap-1">
          {Object.keys(TILES).map((k) => (
            <button key={k} type="button" onClick={() => setLayer(k)} className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${layer === k ? 'bg-[var(--color-accent)] text-white' : 'bg-white/90 text-[#333]'}`}>
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-weak rounded-[14px] px-4 h-11 flex items-center">
        <input value={paste} onChange={(e) => applyPaste(e.target.value)} placeholder="Or paste a Google Maps link / coordinates (28.4595, 77.0266)" className="bg-transparent outline-none w-full text-[15px]" aria-label="Paste a Google Maps link or coordinates" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-tertiary">
        <span>{point ? `Pin at ${point.lat}, ${point.lng} — drag it or click elsewhere to move it.` : 'Click the map, search, or paste a link to place the pin.'}</span>
        {point && (
          <a href={`https://www.google.com/maps?q=${point.lat},${point.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline">
            Check in Google Maps <ExternalLink size={12} />
          </a>
        )}
      </div>
      {note && <p className="text-[var(--color-danger)] text-xs px-1">{note}</p>}
    </div>
  )
}
