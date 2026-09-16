import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Bath,
  BedDouble,
  Calendar,
  Check,
  Heart,
  LayoutPanelLeft,
  Mail,
  MapPin,
  Phone,
  PlayCircle,
  Ruler,
  Share2,
  Sofa,
} from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import PropertyCard from '../../components/property/PropertyCard'
import PropertyBadges from '../../components/property/PropertyBadges'
import PropertyMap from '../../components/property/PropertyMap'
import EMICalculator from '../../components/property/EMICalculator'
import Lightbox from '../../components/property/Lightbox'
import PriceInsight from '../../components/property/PriceInsight'
import DistanceToHubs from '../../components/property/DistanceToHubs'
import LeadForm from '../../components/property/LeadForm'
import { useData } from '../../context/DataContext'

export default function PropertyDetail() {
  const { id } = useParams()
  // Force a full remount whenever the property id changes — React Router reuses
  // the same component instance across /property/:id navigations, which would
  // otherwise leak local state (image index, map toggles, EMI inputs, etc.)
  // from the previously viewed property into the new one.
  return <PropertyDetailInner key={id} id={id} />
}

function PropertyDetailInner({ id }) {
  const { properties, activeProperties, agents, savedIds, toggleSaved, trackRecentlyViewed } = useData()
  const navigate = useNavigate()
  const [activeImg, setActiveImg] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [copied, setCopied] = useState(false)
  const [showFloorPlan, setShowFloorPlan] = useState(false)

  const property = properties.find((p) => p.id === id)

  useEffect(() => {
    if (property) trackRecentlyViewed(property.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?.id])

  if (!property) {
    return (
      <GlassCard hover={false} className="p-12 text-center my-12">
        <p className="text-secondary mb-4">Property not found.</p>
        <GlassButton onClick={() => navigate('/listings')}>Back to Listings</GlassButton>
      </GlassCard>
    )
  }

  if (property.active === false) {
    return (
      <GlassCard hover={false} className="p-12 text-center my-12">
        <p className="text-secondary mb-4">This listing is no longer available.</p>
        <GlassButton onClick={() => navigate('/listings')}>Browse Other Listings</GlassButton>
      </GlassCard>
    )
  }

  const agent = agents.find((a) => a.id === property.agentId)
  const isSaved = savedIds.includes(property.id)

  const similarInCity = activeProperties.filter((p) => p.city === property.city && p.id !== property.id).slice(0, 3)
  const shownIds = new Set([property.id, ...similarInCity.map((p) => p.id)])

  const similarByBudget = activeProperties
    .filter(
      (p) =>
        !shownIds.has(p.id) &&
        p.purpose === property.purpose &&
        p.price >= property.price * 0.75 &&
        p.price <= property.price * 1.25
    )
    .slice(0, 3)
  similarByBudget.forEach((p) => shownIds.add(p.id))

  const moreOfType = activeProperties
    .filter((p) => !shownIds.has(p.id) && p.type === property.type)
    .slice(0, 3)
  moreOfType.forEach((p) => shownIds.add(p.id))

  const moreFromAgent = activeProperties
    .filter((p) => !shownIds.has(p.id) && p.agentId === property.agentId)
    .slice(0, 3)

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: property.title, url })
        return
      } catch {
        /* user cancelled */
      }
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="pb-16">
      <div className="flex items-center gap-2 text-sm text-secondary mb-4">
        <Link to="/listings" className="hover:text-primary">Listings</Link> / <span>{property.city}</span> / <span className="text-primary">{property.title}</span>
      </div>

      {/* Gallery */}
      <GlassCard hover={false} className="p-3 mb-6">
        <button
          className="rounded-[18px] overflow-hidden h-72 md:h-[420px] mb-3 w-full block"
          onClick={() => setLightboxIndex(activeImg)}
        >
          <img src={property.images[activeImg]} alt={property.title} className="w-full h-full object-cover" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex gap-3 overflow-x-auto flex-1">
            {property.images.map((img, i) => (
              <button
                key={img}
                onClick={() => setActiveImg(i)}
                className={`w-24 h-16 rounded-[12px] overflow-hidden shrink-0 spring ${i === activeImg ? 'ring-2 ring-[var(--color-accent)]' : 'opacity-70'}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          {property.floorPlans?.length > 0 && (
            <button
              onClick={() => setShowFloorPlan((v) => !v)}
              className={`glass shrink-0 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 spring ${showFloorPlan ? 'text-[var(--color-accent)]' : ''}`}
            >
              <LayoutPanelLeft size={15} /> Floor Plan
            </button>
          )}
          {property.videoTour && (
            <a
              href="https://www.youtube.com/results?search_query=luxury+home+tour"
              target="_blank"
              rel="noopener noreferrer"
              className="glass shrink-0 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 text-[var(--color-accent)]"
            >
              <PlayCircle size={15} /> Video Tour
            </a>
          )}
        </div>
        {showFloorPlan && property.floorPlans?.length > 0 && (
          <div className="rounded-[16px] overflow-hidden h-64 mt-3">
            <img src={property.floorPlans[0]} alt="Floor plan" className="w-full h-full object-cover" />
          </div>
        )}
      </GlassCard>

      <Lightbox
        images={property.images}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onChange={(i) => { setLightboxIndex(i); setActiveImg(i) }}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <GlassCard hover={false} className="p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-1">{property.title}</h1>
                <p className="text-secondary flex items-center gap-1">
                  <MapPin size={15} /> {property.address}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleShare}
                  className="glass w-11 h-11 rounded-full flex items-center justify-center spring hover:scale-105"
                  aria-label="Share property"
                >
                  {copied ? <Check size={16} className="text-[var(--color-success)]" /> : <Share2 size={16} />}
                </button>
                <button
                  onClick={() => toggleSaved(property.id)}
                  className="glass w-11 h-11 rounded-full flex items-center justify-center spring hover:scale-105"
                >
                  <Heart size={18} className={isSaved ? 'fill-[var(--color-danger)] text-[var(--color-danger)]' : ''} />
                </button>
              </div>
            </div>

            <PropertyBadges property={property} className="mb-4" />

            <p className="text-3xl font-bold text-[var(--color-accent)] mb-6">{property.priceLabel}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { icon: BedDouble, label: 'Bedrooms', value: property.beds },
                { icon: Bath, label: 'Bathrooms', value: property.baths },
                { icon: Ruler, label: 'Area', value: `${property.areaSqft} sqft` },
                { icon: Sofa, label: 'Furnishing', value: property.furnishing },
              ].map((s) => (
                <div key={s.label} className="glass-weak rounded-[16px] p-3 text-center">
                  <s.icon className="mx-auto mb-1 text-[var(--color-accent)]" size={18} />
                  <p className="text-sm font-semibold truncate">{s.value}</p>
                  <p className="text-tertiary text-xs">{s.label}</p>
                </div>
              ))}
            </div>

            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-secondary leading-relaxed mb-6">{property.description}</p>

            <h3 className="font-semibold mb-3">Amenities</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
              {property.amenities.map((a) => (
                <div key={a} className="flex items-center gap-2 text-sm text-secondary">
                  <Check size={14} className="text-[var(--color-success)]" /> {a}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-secondary text-sm">
              <Calendar size={14} /> Built in {property.yearBuilt}
            </div>
          </GlassCard>

          <PropertyMap
            lat={property.lat}
            lng={property.lng}
            address={property.address}
            nearby={property.nearby}
            priceLabel={property.priceLabel}
          />

          <div className="grid sm:grid-cols-2 gap-6">
            <PriceInsight property={property} />
            <DistanceToHubs city={property.city} lat={property.lat} lng={property.lng} />
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
          {agent && (
            <GlassCard hover={false} className="p-5">
              <p className="text-tertiary text-xs uppercase font-semibold mb-3">Listed By</p>
              <div className="flex items-center gap-3 mb-4">
                <img src={agent.avatar} alt={agent.name} className="w-14 h-14 rounded-full object-cover" />
                <div>
                  <p className="font-semibold">{agent.name}</p>
                  <p className="text-secondary text-xs">{agent.role}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <a href={`tel:${agent.phone}`} className="glass-weak rounded-[12px] px-4 py-2.5 flex items-center gap-2 text-sm">
                  <Phone size={14} /> {agent.phone}
                </a>
                <a href={`mailto:${agent.email}`} className="glass-weak rounded-[12px] px-4 py-2.5 flex items-center gap-2 text-sm truncate">
                  <Mail size={14} /> {agent.email}
                </a>
                <a
                  href={`https://wa.me/91${agent.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Hi, I'm interested in ${property.title}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-weak rounded-[12px] px-4 py-2.5 flex items-center gap-2 text-sm text-[#25D366] font-medium"
                >
                  <Phone size={14} /> Chat on WhatsApp
                </a>
              </div>
            </GlassCard>
          )}

          <GlassCard hover={false} className="p-5">
            <h3 className="font-semibold mb-4">Contact / Inquiry</h3>
            <LeadForm property={property} />
          </GlassCard>

          <EMICalculator propertyPrice={property.purpose === 'Buy' ? property.price : property.price * 200} />
        </div>
      </div>

      {similarInCity.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">More Properties in {property.city}</h2>
            <Link to={`/listings?city=${property.city}`} className="text-sm font-medium text-[var(--color-accent)] shrink-0">
              View All →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {similarInCity.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </section>
      )}

      {similarByBudget.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Similar Properties in Your Budget</h2>
            <Link
              to={`/listings?purpose=${property.purpose}&maxPrice=${Math.round(property.price * 1.25)}`}
              className="text-sm font-medium text-[var(--color-accent)] shrink-0"
            >
              View All →
            </Link>
          </div>
          <p className="text-secondary text-sm -mt-4 mb-6">Other cities, similar price range — worth exploring.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {similarByBudget.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </section>
      )}

      {moreOfType.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">More {property.type}s Across India</h2>
            <Link to={`/listings?type=${property.type}`} className="text-sm font-medium text-[var(--color-accent)] shrink-0">
              View All →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {moreOfType.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </section>
      )}

      {agent && moreFromAgent.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">More from {agent.name}</h2>
            <Link to={`/agents/${agent.id}`} className="text-sm font-medium text-[var(--color-accent)] shrink-0">
              View Agent →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {moreFromAgent.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
