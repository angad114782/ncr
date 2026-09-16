import { BadgeCheck, CalendarClock, Clock, Hammer, PlayCircle } from 'lucide-react'
import { daysAgo } from '../../utils/geo'

export default function PropertyBadges({ property, className = '' }) {
  const posted = daysAgo(property.postedDate)

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {property.verified && (
        <span className="glass-weak px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 text-[var(--color-success)]">
          <BadgeCheck size={12} /> Verified
        </span>
      )}
      {property.possessionStatus && (
        <span className="glass-weak px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">
          {property.possessionStatus === 'Ready to Move' ? <Clock size={12} /> : <Hammer size={12} />}
          {property.possessionStatus}
        </span>
      )}
      {property.videoTour && (
        <span className="glass-weak px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 text-[var(--color-accent)]">
          <PlayCircle size={12} /> Video Tour
        </span>
      )}
      {property.reraId && (
        <span className="glass-weak px-2.5 py-1 rounded-full text-xs font-medium">
          RERA: {property.reraId}
        </span>
      )}
      {posted !== null && (
        <span className="glass-weak px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 text-tertiary">
          <CalendarClock size={12} /> {posted === 0 ? 'Listed today' : `Listed ${posted}d ago`}
        </span>
      )}
    </div>
  )
}
