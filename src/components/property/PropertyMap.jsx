import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import L from 'leaflet'
import {
  Expand,
  GraduationCap,
  Hospital,
  MapPin,
  Minimize2,
  Navigation,
  ShoppingBag,
  TrainFront,
} from 'lucide-react'
import GlassCard from '../glass/GlassCard'
import { useTheme } from '../../context/ThemeContext'
import { nearbyDistance } from '../../utils/geo'
import { useSettings } from '../../context/SettingsContext'
import { useGoogleMaps } from '../../utils/googleMaps'

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

/** The same map drawn by Google Maps (used when a Google Maps API key is set in Admin → Settings → Tracking). */
function GoogleMapView({ lat, lng, priceLabel, nearby, satellite, expanded }) {
  const box = useRef(null)
  const map = useRef(null)

  useEffect(() => {
    const g = window.google.maps
    const m = new g.Map(box.current, { center: { lat, lng }, zoom: 14, streetViewControl: false, fullscreenControl: false, mapTypeControl: false, gestureHandling: 'cooperative' })
    map.current = m
    const bounds = new g.LatLngBounds({ lat, lng })
    const width = Math.max(70, priceLabel.length * 8 + 30)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="40"><rect x="1" y="1" rx="15" width="${width - 2}" height="28" fill="#674E40" stroke="#fff" stroke-width="2"/><path d="M${width / 2 - 6} 29 l6 9 l6 -9z" fill="#674E40"/><text x="${width / 2}" y="20" font-family="Arial" font-size="12" font-weight="700" fill="#fff" text-anchor="middle">${priceLabel.replace(/[<>&]/g, '')}</text></svg>`
    new g.Marker({ position: { lat, lng }, map: m, zIndex: 1000, title: priceLabel, icon: { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, scaledSize: new g.Size(width, 40), anchor: new g.Point(width / 2, 38) } })
    const info = new g.InfoWindow()
    nearby.forEach((n) => {
      const marker = new g.Marker({
        position: { lat: n.lat, lng: n.lng },
        map: m,
        title: n.name,
        icon: { path: g.SymbolPath.CIRCLE, scale: 9, fillColor: nearbyColors[n.type] ?? '#8E8E93', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
      })
      bounds.extend({ lat: n.lat, lng: n.lng })
      marker.addListener('click', () => {
        const box = document.createElement('div')
        box.style.cssText = 'font:600 13px system-ui;color:#222'
        box.textContent = n.name
        const sub = document.createElement('div')
        sub.style.cssText = 'font:400 12px system-ui;color:#666'
        sub.textContent = `${n.type} · ${n.distance}`
        box.appendChild(sub)
        info.setContent(box)
        info.open({ map: m, anchor: marker })
      })
    })
    if (nearby.length) m.fitBounds(bounds, 48)
    return () => { map.current = null }
  }, [lat, lng, priceLabel, nearby])

  useEffect(() => { map.current?.setMapTypeId(satellite ? 'hybrid' : 'roadmap') }, [satellite])
  useEffect(() => {
    const t = setTimeout(() => window.google?.maps && map.current && window.google.maps.event.trigger(map.current, 'resize'), 280)
    return () => clearTimeout(t)
  }, [expanded])

  return <div ref={box} style={{ width: '100%', height: '100%' }} />
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

  // Only places with a real position are drawn (a place without one is still listed below). Distances come
  // from those positions, so they match what is on the map.
  const shown = useMemo(() => nearby.map((n) => ({ ...n, distance: nearbyDistance(n, lat, lng) })), [nearby, lat, lng])
  const nearbyPositions = useMemo(() => shown.filter((n) => Number.isFinite(n.lat) && Number.isFinite(n.lng) && n.lat !== null && n.lng !== null), [shown])
  const { marketingConfig } = useSettings()
  const google = useGoogleMaps(marketingConfig?.googleMapsApiKey)
  const useGoogle = google === 'ready'

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
        {useGoogle ? (
          <GoogleMapView lat={lat} lng={lng} priceLabel={priceLabel} nearby={nearbyPositions} satellite={satellite} expanded={expanded} />
        ) : (
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
        )}

        {!useGoogle && !tilesReady && (
          <div className="absolute inset-0 z-[900] skeleton !rounded-none bg-[var(--bg-base-2)] pointer-events-none" aria-hidden="true" />
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

      {shown.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 px-1">
          {shown.map((n) => {
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
