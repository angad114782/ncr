import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building, Building2, Home as HomeIcon, KeyRound, MapPin, Search, TrendingUp, Users } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import GlassInput from '../../components/glass/GlassInput'
import PropertyCard from '../../components/property/PropertyCard'
import RecentlyViewed from '../../components/home/RecentlyViewed'
import Testimonials from '../../components/home/Testimonials'
import FAQSection from '../../components/home/FAQSection'
import { useData } from '../../context/DataContext'

const categories = [
  { label: 'Apartment', icon: Building2 },
  { label: 'Villa', icon: HomeIcon },
  { label: 'Commercial', icon: Building },
  { label: 'Studio', icon: KeyRound },
]

const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai', 'Gurugram']

export default function Home() {
  const { activeProperties: properties, approvedAgents: agents } = useData()
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

  return (
    <div className="pb-16">
      {/* Hero */}
      <section className="text-center pt-6 pb-10">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
          className="text-4xl md:text-6xl font-bold mb-4 tracking-tight"
        >
          Find Your Next <span className="text-[var(--color-accent)]">Home</span>
          <br className="hidden md:block" /> Across India
        </motion.h1>
        <p className="text-secondary max-w-xl mx-auto mb-8 text-base md:text-lg">
          Curated apartments, villas, and commercial spaces in Mumbai, Delhi, Bangalore &amp; beyond.
        </p>

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
              onClick={() => navigate(`/listings?type=${c.label}`)}
              className="glass px-5 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium spring hover:scale-105"
            >
              <c.icon size={16} /> {c.label}
            </button>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {[
          { label: 'Active Listings', value: `${properties.length}+`, icon: Building2 },
          { label: 'Verified Agents', value: `${agents.length}`, icon: Users },
          { label: 'Cities Covered', value: '7', icon: MapPin },
          { label: 'Avg. Rating', value: '4.7★', icon: TrendingUp },
        ].map((s) => (
          <GlassCard key={s.label} className="p-5 text-center">
            <s.icon className="mx-auto mb-2 text-[var(--color-accent)]" size={22} />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-secondary text-xs mt-1">{s.label}</p>
          </GlassCard>
        ))}
      </section>

      {/* Featured */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">Featured Properties</h2>
          <GlassButton variant="glass" size="sm" onClick={() => navigate('/listings')}>
            View All
          </GlassButton>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featured.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </section>

      <RecentlyViewed />
      <Testimonials />
      <FAQSection />
    </div>
  )
}
