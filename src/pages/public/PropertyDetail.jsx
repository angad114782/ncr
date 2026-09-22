import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  Bath,
  BedDouble,
  Calendar,
  Check,
  Eye,
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
import EMICalculator from '../../components/property/EMICalculator'
import Lightbox from '../../components/property/Lightbox'
import PriceInsight from '../../components/property/PriceInsight'
import DistanceToHubs from '../../components/property/DistanceToHubs'
import LeadForm from '../../components/property/LeadForm'
import Seo from '../../components/layout/Seo'
import { useData } from '../../context/DataContext'
import { useSettings } from '../../context/SettingsContext'
import Img from '../../components/common/Img'
import { findByParam } from '../../utils/propertySlug'
import { useInterest } from '../../context/InterestContext'
import ExploreLinks from '../../components/common/ExploreLinks'
import GuideLinks from '../../components/common/GuideLinks'
import { SITE_URL, breadcrumbLd, crawlableImage, listingsPath, propertyPath } from '../../utils/seo'
import Avatar from '../../components/common/Avatar'
import ReviewsSection from '../../components/common/ReviewsSection'
import { DetailSkeleton, Skeleton } from '../../components/common/Skeleton'
import { useRevealPhone } from '../../hooks/useRevealPhone'

// Leaflet needs `window`, so the map is a client-only lazy chunk. Until it loads (and in the
// pre-rendered HTML) we render the address and nearby places as plain, crawlable text.
const PropertyMap = lazy(() => import('../../components/property/PropertyMap'))

function MapPlaceholder({ address, nearby = [] }) {
  return (
    <GlassCard hover={false} className="p-3">
      <div className="flex items-center gap-2 px-2 pt-1 pb-3">
        <MapPin size={16} className="text-[var(--color-accent)] shrink-0" />
        <p className="text-sm font-medium">{address}</p>
      </div>
      <Skeleton className="h-64 !rounded-[16px]" />
      {nearby.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 px-1">
          {nearby.map((n) => (
            <li key={n.name} className="glass-weak rounded-[12px] px-3 py-2 flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{n.name} <span className="text-tertiary">· {n.type}</span></span>
              <span className="text-tertiary text-xs shrink-0">{n.distance}</span>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  )
}

function LazyMap(props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return <MapPlaceholder {...props} />
  return (
    <Suspense fallback={<MapPlaceholder {...props} />}>
      <PropertyMap {...props} />
    </Suspense>
  )
}

export default function PropertyDetail() {
  const { id } = useParams()
  // Force a full remount whenever the property id changes — React Router reuses
  // the same component instance across /property/:id navigations, which would
  // otherwise leak local state (image index, map toggles, EMI inputs, etc.)
  // from the previously viewed property into the new one.
  return <PropertyDetailInner key={id} id={id} />
}

function PropertyDetailInner({ id }) {
  const { properties, activeProperties, agents, savedIds, toggleSaved, trackRecentlyViewed, dataReady } = useData()
  const { siteContent, fill } = useSettings()
  const navigate = useNavigate()
  const { track } = useInterest()
  const [activeImg, setActiveImg] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [copied, setCopied] = useState(false)
  const [showFloorPlan, setShowFloorPlan] = useState(false)

  // `id` is the URL segment: the slug, an old slug, or (old links like /property/p6) the id.
  const property = findByParam(properties, id)
  const agent = property ? agents.find((a) => a.id === property.agentId) : null
  // Called unconditionally (before the early returns below) — React's rules of hooks.
  const revealPhone = useRevealPhone(agent, property)

  useEffect(() => {
    if (property) {
      trackRecentlyViewed(property.id)
      track('view', property)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?.id])

  if (!property && !dataReady) return <DetailSkeleton />
  if (!property) {
    return (
      <GlassCard hover={false} className="p-12 text-center my-12">
        <Seo title="Property Not Found" path={`/property/${id}`} noindex />
        <p className="text-secondary mb-4">Property not found.</p>
        <GlassButton onClick={() => navigate('/listings')}>Back to Listings</GlassButton>
      </GlassCard>
    )
  }

  // Old link (id or renamed slug) → send visitors and search engines to the one canonical URL.
  if (property.slug && id !== property.slug) return <Navigate to={propertyPath(property)} replace />

  if (property.active === false) {
    return (
      <GlassCard hover={false} className="p-12 text-center my-12">
        <Seo title="Listing No Longer Available" path={`/property/${id}`} noindex />
        <p className="text-secondary mb-4">This listing is no longer available.</p>
        <GlassButton onClick={() => navigate('/listings')}>Browse Other Listings</GlassButton>
      </GlassCard>
    )
  }

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

  const bhk = property.beds > 0 ? `${property.beds} BHK ` : ''
  const forWhat = property.purpose === 'Rent' ? 'for Rent' : 'for Sale'
  const place = [property.locality, property.city].filter(Boolean).join(', ')
  const seoTitle = `${bhk}${property.type} ${forWhat} in ${place} — ${property.priceLabel}`
  const seoDescription = [
    `${bhk}${property.type} ${forWhat.toLowerCase()} in ${place} at ${property.priceLabel}.`,
    property.areaSqft ? `${property.areaSqft} sq.ft, ${property.furnishing}, ${property.possessionStatus}.` : '',
    property.reraId ? `RERA: ${property.reraId}.` : '',
    'View photos, price insight, EMI and contact a verified agent.',
  ].filter(Boolean).join(' ')

  const listingLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: seoTitle,
    description: property.description || seoDescription,
    url: `${SITE_URL}${propertyPath(property)}`,
    datePosted: property.postedDate,
    image: property.images.filter(crawlableImage),
    ...(property.price > 0
      ? { offers: { '@type': 'Offer', price: property.price, priceCurrency: 'INR', availability: 'https://schema.org/InStock' } }
      : {}),
    about: {
      '@type': property.type === 'Villa' || property.type === 'House' ? 'House' : 'Apartment',
      numberOfRooms: property.beds || undefined,
      numberOfBathroomsTotal: property.baths || undefined,
      floorSize: property.areaSqft ? { '@type': 'QuantitativeValue', value: property.areaSqft, unitCode: 'FTK' } : undefined,
      address: { '@type': 'PostalAddress', streetAddress: property.address, addressLocality: property.city, addressCountry: 'IN' },
      ...(property.lat != null && property.lng != null
        ? { geo: { '@type': 'GeoCoordinates', latitude: property.lat, longitude: property.lng } }
        : {}),
    },
  }

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
      <Seo
        title={seoTitle}
        description={seoDescription}
        path={propertyPath(property)}
        image={property.images[0]}
        jsonLd={[
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: property.purpose === 'Rent' ? 'Rent' : 'Buy', path: listingsPath({ purpose: property.purpose }) },
            { name: property.city, path: listingsPath({ purpose: property.purpose, city: property.city }) },
            { name: property.title, path: propertyPath(property) },
          ]),
          listingLd,
        ]}
      />
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-secondary mb-4">
        <Link to={listingsPath({ purpose: property.purpose })} className="hover:text-primary">{property.purpose === 'Rent' ? 'Rent' : 'Buy'}</Link> /{' '}
        <Link to={listingsPath({ purpose: property.purpose, city: property.city })} className="hover:text-primary">{property.city}</Link> /{' '}
        <span className="text-primary">{property.title}</span>
      </nav>

      {/* Gallery */}
      <GlassCard hover={false} className="p-3 mb-6">
        <button
          className="rounded-[18px] overflow-hidden h-72 md:h-[420px] mb-3 w-full block"
          onClick={() => setLightboxIndex(activeImg)}
        >
          {property.images[activeImg] ? (
            <Img src={property.images[activeImg]} alt={`${property.title} in ${place}`} priority={activeImg === 0} width={1200} height={630} sizes="(min-width:1024px) 900px, 100vw" className="w-full h-full object-cover" />
          ) : (
            <span className="w-full h-full glass-weak flex items-center justify-center text-tertiary">No photos added yet</span>
          )}
        </button>
        <div className="flex items-center gap-3">
          <div className="flex gap-3 overflow-x-auto flex-1 min-w-0">
            {property.images.map((img, i) => (
              <button
                key={img}
                onClick={() => setActiveImg(i)}
                className={`w-24 h-16 rounded-[12px] overflow-hidden shrink-0 spring ${i === activeImg ? 'ring-2 ring-[var(--color-accent)]' : 'opacity-70'}`}
              >
                <Img src={img} alt="" width={96} height={64} widths={[160, 240]} sizes="96px" className="w-full h-full object-cover" />
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
          {/* A real tour link is rendered only when a listing has a videoUrl — the old
              placeholder pointed every listing at the same YouTube search. */}
          {property.videoUrl && (
            <a
              href={property.videoUrl}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="min-w-0 lg:col-span-2 flex flex-col gap-6">
          <GlassCard hover={false} className="p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold mb-1 break-words">{property.title}</h1>
                <p className="text-secondary flex items-start gap-1 break-words">
                  <MapPin size={15} className="mt-1 shrink-0" /> {property.address}
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
                  onClick={() => {
                    if (!isSaved) track('save', property)
                    toggleSaved(property.id)
                  }}
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

          <LazyMap
            lat={property.lat}
            lng={property.lng}
            address={property.address}
            nearby={property.nearby}
            priceLabel={property.priceLabel}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <PriceInsight property={property} />
            <DistanceToHubs city={property.city} lat={property.lat} lng={property.lng} />
          </div>
        </div>

        <div className="min-w-0 flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
          {agent && (
            <GlassCard hover={false} className="p-5">
              <p className="text-tertiary text-xs uppercase font-semibold mb-3">Listed By</p>
              <div className="flex items-center gap-3 mb-4">
                <Avatar src={agent.avatar} name={agent.name} alt={agent.name} className="w-14 h-14 rounded-full object-cover" />
                <div>
                  <p className="font-semibold">{agent.name}</p>
                  <p className="text-secondary text-xs">{agent.role}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {revealPhone.revealed ? (
                  <a href={`tel:${agent.phone}`} className="glass-weak rounded-[12px] px-4 py-2.5 flex items-center gap-2 text-sm">
                    <Phone size={14} /> {agent.phone}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={revealPhone.onReveal}
                    aria-label="Show phone number"
                    className="glass-weak rounded-[12px] px-4 py-2.5 flex items-center gap-2 text-sm w-full text-left"
                  >
                    <Phone size={14} className="shrink-0" />
                    <span className="flex-1 font-mono tracking-wide">{revealPhone.masked}</span>
                    <Eye size={15} className="text-[var(--color-accent)] shrink-0" />
                  </button>
                )}
                <a href={`mailto:${agent.email}`} className="glass-weak rounded-[12px] px-4 py-2.5 flex items-center gap-2 text-sm truncate">
                  <Mail size={14} /> {agent.email}
                </a>
                <a
                  href={`https://wa.me/91${agent.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(fill(siteContent.contact.waProperty).replace(/\{property\}/g, property.title))}`}
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
            <h3 className="font-semibold mb-1">Interested? Talk to an Expert</h3>
            <p className="text-secondary text-xs mb-4">Free guidance · site visits · no obligation</p>
            <LeadForm property={property} />
          </GlassCard>

          <EMICalculator propertyPrice={property.purpose === 'Buy' ? property.price : property.price * 200} />
        </div>
      </div>

      <ReviewsSection targetType="property" targetId={property.id} className="mt-6" />

      {similarInCity.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">More Properties in {property.city}</h2>
            <Link to={listingsPath({ purpose: property.purpose, city: property.city })} className="text-sm font-medium text-[var(--color-accent)] shrink-0">
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
              to={`${listingsPath({ purpose: property.purpose })}?maxPrice=${Math.round(property.price * 1.25)}`}
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
            <Link to={listingsPath({ purpose: property.purpose, type: property.type })} className="text-sm font-medium text-[var(--color-accent)] shrink-0">
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

      <ExploreLinks property={property} className="mt-12" />
      <GuideLinks className="mt-12" />
    </div>
  )
}
