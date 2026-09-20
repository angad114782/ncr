import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, Building2, MapPin } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import CeoAvatar from '../../components/company/CeoAvatar'
import FAQSection from '../../components/home/FAQSection'
import Seo from '../../components/layout/Seo'
import { useData } from '../../context/DataContext'
import { useSettings } from '../../context/SettingsContext'
import { getIcon } from '../../utils/icons'
import { SITE_URL, breadcrumbLd, organizationLd } from '../../utils/seo'

export default function About() {
  const { activeProperties, approvedAgents, activeBlogPosts } = useData()
  const { cities, whatsappConfig, mailConfig, company, siteContent, fill } = useSettings()
  const { ceo } = company
  const c = siteContent.about

  const stats = [
    { value: activeProperties.length, label: 'Live listings' },
    { value: cities.length, label: 'Cities covered' },
    { value: approvedAgents.length, label: 'Approved consultants' },
    { value: activeBlogPosts.length, label: 'Buyer guides published' },
  ]

  return (
    <div className="pb-16">
      <Seo
        title={`About ${company.name} — Trusted Property Platform Led by ${ceo.name}`}
        description={`${company.name} helps you buy or rent verified homes across India. Led by ${ceo.title} ${ceo.name} (${ceo.experienceYears}+ years in real estate). Learn how we verify listings, who we are and how we work.`}
        path="/about"
        jsonLd={[
          breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'About', path: '/about' }]),
          {
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            url: `${SITE_URL}/about`,
            name: `About ${company.name}`,
            mainEntity: organizationLd({ company, phone: whatsappConfig.displayPhone, email: mailConfig.fromEmail, cities }),
          },
        ]}
      />

      {/* Hero */}
      <GlassCard hover={false} strong className="p-10 md:p-16 text-center mb-12">
        <span className="w-16 h-16 rounded-[18px] bg-[var(--color-accent)] flex items-center justify-center text-white mx-auto mb-5">
          <Building2 size={28} />
        </span>
        <h1 className="text-3xl md:text-5xl font-bold mb-4">About {company.name}</h1>
        <p className="text-secondary max-w-2xl mx-auto text-base md:text-lg mb-6">{fill(c.heroText)}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/listings"><GlassButton className="w-full justify-center">Browse Properties <ArrowRight size={16} /></GlassButton></Link>
          <Link to="/contact"><GlassButton variant="glass" className="w-full justify-center">Talk to Our Team</GlassButton></Link>
        </div>
      </GlassCard>

      {/* Story & mission */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12" aria-labelledby="story-heading">
        <GlassCard hover={false} className="p-8">
          <h2 id="story-heading" className="text-2xl font-bold mb-3">{fill(c.storyTitle)}</h2>
          {c.storyParagraphs.map((p, i) => (
            <p key={i} className="text-secondary leading-relaxed mb-3 last:mb-0">{fill(p)}</p>
          ))}
        </GlassCard>
        <GlassCard hover={false} className="p-8">
          <h2 className="text-2xl font-bold mb-3">{fill(c.missionTitle)}</h2>
          <p className="text-secondary leading-relaxed mb-4">{fill(c.missionText)}</p>
          <ul className="flex flex-col gap-3">
            {c.missionValues.map((v, i) => {
              const Icon = getIcon(v.icon)
              return (
                <li key={i} className="flex items-start gap-3 text-secondary">
                  <Icon size={18} className="text-[var(--color-accent)] shrink-0 mt-0.5" /> {fill(v.text)}
                </li>
              )
            })}
          </ul>
        </GlassCard>
      </section>

      {/* Leadership */}
      <section className="mb-12" aria-labelledby="leadership-heading">
        <h2 id="leadership-heading" className="text-2xl md:text-3xl font-bold mb-6">Leadership</h2>
        <GlassCard hover={false} strong className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6 md:items-center">
            <CeoAvatar className="w-28 h-28 text-4xl" />
            <div className="flex-1">
              <h3 className="text-xl font-bold">{ceo.name}</h3>
              <p className="text-[var(--color-accent)] font-semibold mb-2">{ceo.title} · {ceo.experienceYears}+ years in real estate</p>
              <p className="text-secondary leading-relaxed">{ceo.summary}</p>
            </div>
            <Link to="/team" className="shrink-0"><GlassButton variant="glass">Meet the team <ArrowRight size={16} /></GlassButton></Link>
          </div>
        </GlassCard>
      </section>

      {/* Services */}
      {c.services.length > 0 && (
        <section className="mb-12" aria-labelledby="services-heading">
          <div className="mb-6">
            <h2 id="services-heading" className="text-2xl md:text-3xl font-bold">{fill(c.servicesTitle)}</h2>
            <p className="text-secondary mt-1">{fill(c.servicesSubtitle)}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {c.services.map((s, i) => {
              const Icon = getIcon(s.icon)
              return (
                <GlassCard key={i} className="p-6">
                  <div className="w-11 h-11 rounded-full glass-weak flex items-center justify-center mb-4">
                    <Icon size={20} className="text-[var(--color-accent)]" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1.5">{s.title}</h3>
                  <p className="text-secondary text-sm leading-relaxed">{fill(s.desc)}</p>
                </GlassCard>
              )
            })}
          </div>
        </section>
      )}

      {/* Verification */}
      {c.trust.length > 0 && (
        <section className="mb-12" aria-labelledby="verify-heading">
          <div className="mb-6">
            <h2 id="verify-heading" className="text-2xl md:text-3xl font-bold">{fill(c.trustTitle)}</h2>
            <p className="text-secondary mt-1">{fill(c.trustSubtitle)}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {c.trust.map((v, i) => (
              <GlassCard key={i} hover={false} className="p-6 flex gap-4">
                <BadgeCheck className="text-[var(--color-success)] shrink-0" size={24} />
                <div>
                  <h3 className="font-semibold mb-1">{v.title}</h3>
                  <p className="text-secondary text-sm leading-relaxed">{fill(v.desc)}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>
      )}

      {/* Live numbers */}
      <section className="mb-12" aria-labelledby="numbers-heading">
        <h2 id="numbers-heading" className="text-2xl md:text-3xl font-bold mb-2">{fill(c.numbersTitle)}</h2>
        <p className="text-secondary mb-6">{fill(c.numbersSubtitle)}</p>
        <GlassCard hover={false} className="p-8 md:p-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-3xl md:text-4xl font-bold text-[var(--color-accent)]">{s.value}</p>
              <p className="text-secondary text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </GlassCard>
      </section>

      {/* Cities */}
      {cities.length > 0 && (
        <section className="mb-12" aria-labelledby="cities-heading">
          <h2 id="cities-heading" className="text-2xl md:text-3xl font-bold mb-6">Cities we serve</h2>
          <div className="flex flex-wrap gap-3">
            {cities.map((city) => (
              <Link
                key={city}
                to={`/listings?purpose=Buy&city=${encodeURIComponent(city)}`}
                className="glass px-5 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium spring hover:scale-105"
              >
                <MapPin size={15} /> Property in {city}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Compliance */}
      <section className="mb-12" aria-labelledby="compliance-heading">
        <GlassCard hover={false} className="p-8">
          <h2 id="compliance-heading" className="text-2xl font-bold mb-3">Compliance & disclosures</h2>
          <ul className="flex flex-col gap-2 text-secondary text-sm leading-relaxed list-disc pl-5">
            {company.reraAgentId && <li>RERA agent registration number: <strong className="text-primary">{company.reraAgentId}</strong></li>}
            {c.compliance.map((p, i) => <li key={i}>{fill(p)}</li>)}
          </ul>
        </GlassCard>
      </section>

      <FAQSection page="about" title="About us — FAQs" subtitle="" className="mb-12 max-w-3xl" />

      <GlassCard hover={false} strong className="p-8 md:p-12 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">{fill(c.ctaTitle)}</h2>
        <p className="text-secondary max-w-lg mx-auto mb-6">{fill(c.ctaText)}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/contact"><GlassButton className="w-full justify-center">Contact Us</GlassButton></Link>
          <Link to="/blog"><GlassButton variant="glass" className="w-full justify-center">Read Buyer Guides</GlassButton></Link>
        </div>
      </GlassCard>
    </div>
  )
}
