import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building, Building2, Home as HomeIcon, KeyRound, MapPin, Search, TrendingUp, Users } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import GlassInput from '../../components/glass/GlassInput'
import PropertyCard from '../../components/property/PropertyCard'
import ExploreCities from '../../components/home/ExploreCities'
import CityPriceTrends from '../../components/home/CityPriceTrends'
import NewestListings from '../../components/home/NewestListings'
import WhyChooseUs from '../../components/home/WhyChooseUs'
import HowItWorks from '../../components/home/HowItWorks'
import TopAgents from '../../components/home/TopAgents'
import ListPropertyCta from '../../components/home/ListPropertyCta'
import RecentlyViewed from '../../components/home/RecentlyViewed'
import Testimonials from '../../components/home/Testimonials'
import FAQSection from '../../components/home/FAQSection'
import HeroBlobs from '../../components/home/HeroBlobs'
import RotatingWord from '../../components/home/RotatingWord'
import AnimatedCounter from '../../components/home/AnimatedCounter'
import BudgetFinder from '../../components/home/BudgetFinder'
import PopularSearches from '../../components/home/PopularSearches'
import PromoTicker from '../../components/home/PromoTicker'
import LatestPosts from '../../components/home/LatestPosts'
import CeoSpotlight from '../../components/home/CeoSpotlight'
import Reveal from '../../components/glass/Reveal'
import Seo, { SITE_URL } from '../../components/layout/Seo'
import { useData } from '../../context/DataContext'
import { useSettings } from '../../context/SettingsContext'
import { normalizeSections } from '../../data/siteDefaults'
import { organizationLd } from '../../utils/seo'

const typeIcons = {
  Apartment: Building2,
  Villa: HomeIcon,
  Commercial: Building,
  Studio: KeyRound,
  Penthouse: Building2,
  House: HomeIcon,
}

export default function Home() {
  const { activeProperties: properties, approvedAgents: agents } = useData()
  const { cities, propertyTypes, whatsappConfig, mailConfig, company, siteContent, fill } = useSettings()
  const hero = siteContent.home
  const categories = propertyTypes.map((label) => ({ label, icon: typeIcons[label] || Building2 }))
  const navigate = useNavigate()
  const [purpose, setPurpose] = useState('Buy')
  const [city, setCity] = useState('')
  const [keyword, setKeyword] = useState('')

  const featured = properties.filter((p) => p.featured).slice(0, 4)

  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set('purpose', purpose)
    if (city) params.set('city', city)
    if (keyword) params.set('q', keyword)
    navigate(`/listings?${params.toString()}`)
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      organizationLd({ company, phone: whatsappConfig.displayPhone, email: mailConfig.fromEmail, cities }),
      {
        '@type': 'WebSite',
        name: company.name,
        url: SITE_URL,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/listings?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }

  // Every block below the hero is optional and re-orderable from Admin → Site Content → Home page.
  const sectionBlocks = {
    stats: (
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {[
          { label: 'Active Listings', value: properties.length, suffix: '+', icon: Building2 },
          { label: 'Verified Agents', value: agents.length, suffix: '', icon: Users },
          { label: 'Cities Covered', value: cities.length, suffix: '', icon: MapPin },
          { label: 'Property Types', value: propertyTypes.length, suffix: '', icon: TrendingUp },
        ].map((s) => (
          <GlassCard key={s.label} className="p-5 text-center">
            <s.icon className="mx-auto mb-2 text-[var(--color-accent)]" size={22} />
            <p className="text-2xl font-bold">
              <AnimatedCounter value={s.value} suffix={s.suffix} decimals={s.decimals} />
            </p>
            <p className="text-secondary text-xs mt-1">{s.label}</p>
          </GlassCard>
        ))}
      </section>
    ),
    featured: featured.length > 0 && (
      <section className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">Featured Properties</h2>
          <GlassButton variant="glass" size="sm" onClick={() => navigate('/listings')}>
            View All
          </GlassButton>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featured.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </section>
    ),
    budget: <BudgetFinder />,
    newest: <NewestListings excludeIds={featured.map((p) => p.id)} />,
    cities: <ExploreCities />,
    trends: <CityPriceTrends />,
    why: <WhyChooseUs />,
    how: <HowItWorks />,
    popular: <PopularSearches />,
    agents: <TopAgents />,
    ceo: <CeoSpotlight />,
    recent: <RecentlyViewed />,
    testimonials: <Testimonials />,
    posts: <LatestPosts />,
    cta: <ListPropertyCta />,
    faq: <FAQSection page="home" />,
  }

  return (
    <div className="pb-16">
      <Seo
        title="Buy & Rent Flats, Villas and Commercial Property in India"
        description={`Search verified 1, 2, 3 BHK flats, villas, studios and commercial property to buy or rent in ${cities.slice(0, 7).join(', ')}. Free guidance from a team led by ${company.ceo.title} ${company.ceo.name}.`}
        path="/"
        jsonLd={jsonLd}
      />

      {/* Admin-managed running strip: sits between the navbar and the hero */}
      <PromoTicker />

      {/* Hero */}
      <section className="relative isolate overflow-hidden text-center pt-6 pb-10">
        <HeroBlobs />
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
          className="text-4xl md:text-6xl font-bold mb-4 tracking-tight"
        >
          {fill(hero.heroPrefix)} <RotatingWord words={hero.rotatingWords} />
          {hero.heroSuffix && <><br className="hidden md:block" /> {fill(hero.heroSuffix)}</>}
        </motion.h1>
        <p className="text-secondary max-w-xl mx-auto mb-8 text-base md:text-lg">{fill(hero.heroSubtitle)}</p>

        <GlassCard hover={false} strong className="max-w-3xl mx-auto p-3 md:p-4">
          <div className="glass-weak p-1 rounded-full flex mb-3 w-fit mx-auto md:mx-0">
            {['Buy', 'Rent'].map((p) => (
              <button
                key={p}
                onClick={() => setPurpose(p)}
                className={`px-6 py-2 rounded-full text-sm font-medium spring ${
                  purpose === p ? 'glass-strong text-[var(--color-accent)]' : 'text-secondary'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <GlassInput
                icon={Search}
                placeholder="Search by locality, project or landmark"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <div className="md:w-48">
              <GlassInput as="select" icon={MapPin} value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">All Cities</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </GlassInput>
            </div>
            <GlassButton type="submit" size="md" className="md:w-auto justify-center">
              <Search size={18} /> Search
            </GlassButton>
          </form>
        </GlassCard>

        <div className="flex flex-wrap justify-center gap-3 mt-6">
          {categories.map((c) => (
            <button
              key={c.label}
              onClick={() => navigate(`/listings?type=${encodeURIComponent(c.label)}`)}
              className="glass px-5 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium spring hover:scale-105"
            >
              <c.icon size={16} /> {c.label}
            </button>
          ))}
        </div>
      </section>

      {normalizeSections(hero.sections)
        .filter((s) => s.enabled !== false && sectionBlocks[s.id])
        .map((s) => (
          <Reveal key={s.id}>{sectionBlocks[s.id]}</Reveal>
        ))}
    </div>
  )
}
