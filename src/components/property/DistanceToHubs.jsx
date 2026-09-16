import { Briefcase, Plane, TrainFront } from 'lucide-react'
import GlassCard from '../glass/GlassCard'
import landmarks from '../../data/landmarks.json'
import { haversineKm } from '../../utils/geo'

const typeIcons = {
  Airport: Plane,
  Railway: TrainFront,
  'Business Hub': Briefcase,
}

export default function DistanceToHubs({ city, lat, lng }) {
  const cityLandmarks = landmarks[city]
  if (!cityLandmarks || lat == null || lng == null) return null

  return (
    <GlassCard hover={false} className="p-5">
      <h3 className="font-semibold mb-1">Distance to Key Hubs</h3>
      <p className="text-secondary text-xs mb-4">Straight-line distance from this property</p>
      <div className="flex flex-col gap-2">
        {cityLandmarks.map((lm) => {
          const Icon = typeIcons[lm.type] ?? Briefcase
          const km = haversineKm(lat, lng, lm.lat, lm.lng)
          return (
            <div key={lm.name} className="glass-weak rounded-[14px] px-4 py-3 flex items-center gap-3">
              <span className="w-9 h-9 rounded-full glass-strong flex items-center justify-center shrink-0 text-[var(--color-accent)]">
                <Icon size={16} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{lm.name}</p>
                <p className="text-tertiary text-xs">{lm.type}</p>
              </div>
              <span className="text-sm font-semibold shrink-0">{km.toFixed(1)} km</span>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}
