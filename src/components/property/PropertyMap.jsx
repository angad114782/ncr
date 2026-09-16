import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import L from 'leaflet'
import {
  Expand,
  GraduationCap,
  Hospital,
  Loader2,
  MapPin,
  Minimize2,
  Navigation,
  ShoppingBag,
  TrainFront,
} from 'lucide-react'
import GlassCard from '../glass/GlassCard'
import { useTheme } from '../../context/ThemeContext'
import { destinationPoint, hashBearing } from '../../utils/geo'

const nearbyIcons = {
  School: GraduationCap,
  Hospital: Hospital,
  Metro: TrainFront,
  Mall: ShoppingBag,
}

const nearbyColors = {
  School: '#674E40',
  Hospital: '#FF453A',
  Metro: '#30D158',
  Mall: '#C97B4F',
}

const TILE_LAYERS = {
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
  },
}

function priceIcon(label) {
  const width = Math.max(70, label.length * 8 + 30)
  return L.divIcon({
    html: `<div style="width:100%;height:100%;display:flex;align-items:flex-end;justify-content:center;"><div style="background:var(--color-accent);color:#fff;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,0.35);border:2px solid #fff;position:relative;">${label}<div style="position:absolute;bottom:-7px;left:50%;transform:translateX(-50%) rotate(45deg);width:10px;height:10px;background:var(--color-accent);border-right:2px solid #fff;border-bottom:2px solid #fff;"></div></div></div>`,
    className: '',
    iconSize: [width, 40],
    iconAnchor: [width / 2, 46],
  })
}

function nearbyIconDiv(type) {
  const color = nearbyColors[type] ?? '#8E8E93'
  return L.divIcon({
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid #fff;"></div>`,
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

function MapResizeHandler({ trigger }) {
  const map = useMap()

  // Re-measure on the expand/collapse toggle (CSS height transition).
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 260)
    return () => clearTimeout(t)
  }, [trigger, map])

  // Re-measure on mount and whenever the container itself resizes for any
  // other reason (font load, layout shift, being restored from a hidden
  // tab, etc.) — Leaflet reads the container's pixel size once at init and
  // otherwise has no way to know it changed, which is what causes a
  // map that looks blank/mis-aligned until the window is resized.
  useEffect(() => {
    map.invalidateSize()
    const container = map.getContainer()
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container)
    return () => observer.disconnect()
  }, [map])

  return null
}

export default function PropertyMap({ lat, lng, address, nearby = [], priceLabel = 'Property' }) {
  const { theme } = useTheme()
  const [satellite, setSatellite] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [tilesReady, setTilesReady] = useState(false)

  const tile = satellite ? TILE_LAYERS.satellite : TILE_LAYERS.streets
  const applyDarkFilter = theme === 'dark' && !satellite

  useEffect(() => {
    setTilesReady(false)
    const fallback = setTimeout(() => setTilesReady(true), 4000)
    return () => clearTimeout(fallback)
  }, [tile.url])

  const nearbyPositions = useMemo(
    () =>
      nearby.map((n) => {
        const km = parseFloat(n.distance) || 1
        const bearing = hashBearing(n.name)
        const pos = destinationPoint(lat, lng, bearing, km)
        return { ...n, ...pos }
      }),
    [nearby, lat, lng]
  )

  if (lat == null || lng == null) return null

  return (
    <GlassCard hover={false} className="p-3">
      <div className="flex items-center justify-between gap-2 px-2 pt-1 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin size={16} className="text-[var(--color-accent)] shrink-0" />
          <p className="text-sm font-medium truncate">{address}</p>
        </div>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="glass-weak px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shrink-0 spring hover:scale-105"
        >
          <Navigation size={12} /> Directions
        </a>
      </div>

      <div className={`relative rounded-[16px] overflow-hidden transition-[height] duration-300 ${expanded ? 'h-[480px]' : 'h-64'}`}>
        <MapContainer
          center={[lat, lng]}
          zoom={14}
          scrollWheelZoom={false}
          zoomControl={false}
          style={{ width: '100%', height: '100%', background: 'var(--bg-base-2)' }}
          className={applyDarkFilter ? 'map-dark-filter' : ''}
        >
          <MapResizeHandler trigger={expanded} />
          <TileLayer
            key={tile.url}
            url={tile.url}
            attribution={tile.attribution}
            eventHandlers={{ load: () => setTilesReady(true) }}
          />
          <ZoomControl position="bottomright" />

          <Marker position={[lat, lng]} icon={priceIcon(priceLabel)} />

          {nearbyPositions.map((n) => {
            const Icon = nearbyIcons[n.type] ?? MapPin
            return (
              <Marker key={n.name} position={[n.lat, n.lng]} icon={nearbyIconDiv(n.type)}>
                <Popup>
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Icon size={13} /> {n.name}
                  </div>
                  <p className="text-xs text-gray-500">{n.type} · {n.distance}</p>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>

        {!tilesReady && (
          <div className="absolute inset-0 z-[900] flex items-center justify-center bg-[var(--bg-base-2)] pointer-events-none">
            <Loader2 size={22} className="animate-spin text-[var(--color-accent)]" />
          </div>
        )}

        <div className="absolute top-3 right-3 z-[1000] flex gap-1.5">
          <button
            onClick={() => setSatellite((v) => !v)}
            className="glass-strong px-3 py-1.5 rounded-full text-xs font-semibold spring hover:scale-105"
          >
            {satellite ? 'Map' : 'Satellite'}
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="glass-strong w-8 h-8 rounded-full flex items-center justify-center spring hover:scale-105"
            aria-label={expanded ? 'Collapse map' : 'Expand map'}
          >
            {expanded ? <Minimize2 size={13} /> : <Expand size={13} />}
          </button>
        </div>
      </div>

      {nearby.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-2 mt-3 px-1">
          {nearby.map((n) => {
            const Icon = nearbyIcons[n.type] ?? MapPin
            return (
              <div key={n.name} className="glass-weak rounded-[12px] px-3 py-2 flex items-center gap-2 text-sm">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white"
                  style={{ background: nearbyColors[n.type] ?? '#8E8E93' }}
                >
                  <Icon size={12} />
                </span>
                <span className="truncate flex-1">{n.name}</span>
                <span className="text-tertiary text-xs shrink-0">{n.distance}</span>
              </div>
            )
          })}
        </div>
      )}
    </GlassCard>
  )
}
