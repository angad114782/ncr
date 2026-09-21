import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BadgeCheck, BedDouble, Bath, GitCompare, Heart, MapPin, Ruler } from 'lucide-react'
import Tilt from '../effects/Tilt'
import Img from '../common/Img'
import { propertyPath } from '../../utils/seo'
import { useData } from '../../context/DataContext'
import { useInterest } from '../../context/InterestContext'

/** `headingAs`: a listing that is repeated further down the page (budget results…) uses "p" so the page has no duplicate headings. */
export default function PropertyCard({ property, headingAs: Heading = 'h3' }) {
  const { savedIds, toggleSaved, compareIds, toggleCompare } = useData()
  const { track } = useInterest()
  const isSaved = savedIds.includes(property.id)
  const isComparing = compareIds.includes(property.id)

  return (
    <Tilt className="h-full rounded-[24px]" max={6}>
    <motion.div
      className="glass rounded-[24px] overflow-hidden group"
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    >
      <div className="relative h-52 overflow-hidden">
        {property.images?.[0] ? (
          <Img
            src={property.images[0]}
            alt={`${property.title} in ${property.locality}, ${property.city}`}
            width={600}
            height={416}
            sizes="(min-width:1280px) 360px, (min-width:640px) 45vw, 92vw"
            widths={[400, 640, 900]}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full glass-weak flex items-center justify-center text-tertiary text-sm">No photo yet</div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="glass-strong px-3 py-1 rounded-full text-xs font-semibold">{property.purpose}</span>
          {property.verified && (
            <span className="glass-strong px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 text-[var(--color-success)]">
              <BadgeCheck size={12} />
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3 flex gap-1.5">
          <button
            onClick={(e) => {
              e.preventDefault()
              if (!isComparing) track('compare', property)
              toggleCompare(property.id)
            }}
            className={`glass-strong w-9 h-9 rounded-full flex items-center justify-center spring hover:scale-110 ${
              isComparing ? 'text-[var(--color-accent)]' : ''
            }`}
            aria-label="Add to compare"
          >
            <GitCompare size={15} />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              if (!isSaved) track('save', property)
              toggleSaved(property.id)
            }}
            className="glass-strong w-9 h-9 rounded-full flex items-center justify-center spring hover:scale-110"
            aria-label="Save property"
          >
            <Heart size={16} className={isSaved ? 'fill-[var(--color-danger)] text-[var(--color-danger)]' : ''} />
          </button>
        </div>
        <div className="absolute bottom-3 left-3 glass-strong px-3 py-1.5 rounded-full text-sm font-semibold">
          {property.priceLabel}
        </div>
        {property.possessionStatus === 'Under Construction' && (
          <div className="absolute bottom-3 right-3 glass-strong px-2.5 py-1 rounded-full text-xs font-medium">
            Under Construction
          </div>
        )}
      </div>

      <Link to={propertyPath(property)} className="block p-5">
        <Heading className="font-semibold text-lg mb-1 truncate">{property.title}</Heading>
        <p className="text-secondary text-sm flex items-center gap-1 mb-4">
          <MapPin size={14} /> {property.locality}, {property.city}
        </p>
        <div className="flex items-center gap-4 text-sm text-secondary border-t border-[var(--glass-border)] pt-3">
          {property.beds > 0 && (
            <span className="flex items-center gap-1">
              <BedDouble size={15} /> {property.beds}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Bath size={15} /> {property.baths}
          </span>
          <span className="flex items-center gap-1">
            <Ruler size={15} /> {property.areaSqft} sqft
          </span>
        </div>
      </Link>
    </motion.div>
    </Tilt>
  )
}
