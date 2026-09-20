import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Calculator,
  FileCheck2,
  HeartHandshake,
  Home as HomeIcon,
  KeyRound,
  Landmark,
  MapPin,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import CeoAvatar from '../../components/company/CeoAvatar'
import Seo from '../../components/layout/Seo'
import { useData } from '../../context/DataContext'
import { useSettings } from '../../context/SettingsContext'
import { COMPANY } from '../../data/company'
import { allPosts } from '../../utils/blog'
import { SITE_URL, breadcrumbLd, faqLd, organizationLd } from '../../utils/seo'

const services = [
  { icon: HomeIcon, title: 'Buy a Home', desc: 'Apartments, villas, builder floors and penthouses — filter by city, BHK, budget and possession status.' },
  { icon: KeyRound, title: 'Rent a Property', desc: 'Furnished and unfurnished homes and commercial spaces for rent, with transparent monthly pricing.' },
  { icon: Building2, title: 'Sell or List Your Property', desc: 'Reach serious buyers and tenants. Send us your property details and our team will help you list it.' },
  { icon: Calculator, title: 'Budget & Loan Guidance', desc: 'Use our EMI calculator and home-loan budget tool to understand what you can afford before you shortlist.' },
  { icon: FileCheck2, title: 'Paperwork Guidance', desc: 'Practical checklists for RERA checks, title documents, stamp duty and registration — in our blog.' },
  { icon: TrendingUp, title: 'Compare & Decide', desc: 'Side-by-side property comparison and same-city price insights so you can spot fair pricing.' },
]

const verification = [
  { title: 'Agents are approved first', desc: 'Property consultants appear on the site only after approval by our admin team.' },
  { title: 'Verified badge is earned', desc: 'A listing shows the “Verified” badge only when our team has marked it verified.' },
  { title: 'RERA number on display', desc: 'Where a project has a RERA registration, the number is shown on the listing so you can check it on the state portal.' },
  { title: 'Fair-price context', desc: 'Price Insight compares a listing with other listings in the same city — never against unrelated markets.' },
]

const faqs = [
  {
    question: `Who is behind ${COMPANY.name}?`,
    answer: `${COMPANY.name} is led by ${COMPANY.ceo.name}, CEO, who has ${COMPANY.ceo.experienceYears}+ years of experience in the real estate market. You can read more on our Team page.`,
  },
  {
    question: 'Which cities do you cover?',
    answer: 'We list properties to buy and rent across Mumbai, Delhi, Bangalore, Pune, Hyderabad, Chennai and Gurugram, and we keep adding cities based on demand.',
  },
  {
    question: 'Is it free to search and contact agents?',
    answer: 'Yes. Browsing listings, saving properties, using the calculators and contacting our team is free. If any brokerage applies to a deal, it is discussed and agreed with you up front.',
  },
  {
    question: 'How do I list my property with you?',
    answer: 'Use the Contact page, choose “List my property”, and share the basics — city, type, expected price and your phone number. Our team will call you to take it forward.',
  },
  {
    question: 'Do you guarantee the accuracy of every listing?',
    answer: 'We work to keep information accurate and show verification badges only where earned, but details such as price and availability can change. Please confirm final details, RERA registration and documents directly before you pay.',
  },
]

export default function About() {
  const { activeProperties, approvedAgents } = useData()
  const { cities, whatsappConfig, mailConfig } = useSettings()
  const { ceo } = COMPANY

  const stats = [
    { value: activeProperties.length, label: 'Live listings' },
    { value: cities.length, label: 'Cities covered' },
    { value: approvedAgents.length, label: 'Approved consultants' },
    { value: allPosts.length, label: 'Buyer guides published' },
  ]

  return (
    <div className="pb-16">
      <Seo
        title={`About ${COMPANY.name} — Trusted Property Platform Led by ${ceo.name}`}
        description={`${COMPANY.name} helps you buy or rent verified homes across India. Led by CEO ${ceo.name} (${ceo.experienceYears}+ years in real estate). Learn how we verify listings, who we are and how we work.`}
        path="/about"
        jsonLd={[
          breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'About', path: '/about' }]),
          {
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            url: `${SITE_URL}/about`,
            name: `About ${COMPANY.name}`,
            mainEntity: organizationLd({ phone: whatsappConfig.displayPhone, email: mailConfig.fromEmail, cities }),
          },
          faqLd(faqs),
        ]}
      />

      {/* Hero */}
      <GlassCard hover={false} strong className="p-10 md:p-16 text-center mb-12">
        <span className="w-16 h-16 rounded-[18px] bg-[var(--color-accent)] flex items-center justify-center text-white mx-auto mb-5">
          <Building2 size={28} />
        </span>
        <h1 className="text-3xl md:text-5xl font-bold mb-4">About {COMPANY.name}</h1>
        <p className="text-secondary max-w-2xl mx-auto text-base md:text-lg mb-6">
          We help people buy, rent and sell property across India with clear information, verified listings and honest
          guidance — led by {ceo.name}, who brings {ceo.experienceYears}+ years of real estate experience.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/listings"><GlassButton className="w-full justify-center">Browse Properties <ArrowRight size={16} /></GlassButton></Link>
          <Link to="/contact"><GlassButton variant="glass" className="w-full justify-center">Talk to Our Team</GlassButton></Link>
        </div>
      </GlassCard>

      {/* Story & mission */}
      <section className="grid md:grid-cols-2 gap-6 mb-12" aria-labelledby="story-heading">
        <GlassCard hover={false} className="p-8">
          <h2 id="story-heading" className="text-2xl font-bold mb-3">Why we exist</h2>
          <p className="text-secondary leading-relaxed mb-3">
            Searching for a home is stressful when prices are unclear, listings are outdated and every call ends in a
            sales pitch. {COMPANY.name} was built to make the process calmer: one place to search, compare, calculate
            and talk to a real person.
          </p>
          <p className="text-secondary leading-relaxed">
            Whether you are a first-time buyer in Gurugram, a tenant in Bangalore or an owner in Mumbai looking for the
            right buyer, our goal is the same — help you make a confident decision with the facts in front of you.
          </p>
        </GlassCard>
        <GlassCard hover={false} className="p-8">
          <h2 className="text-2xl font-bold mb-3">Our mission</h2>
          <p className="text-secondary leading-relaxed mb-4">
            To make property search in India transparent, verified and free of pressure.
          </p>
          <ul className="flex flex-col gap-3">
            {[
              { icon: ShieldCheck, text: 'Transparency — real prices and the full cost picture.' },
              { icon: HeartHandshake, text: 'Client first — advice that fits your budget, not ours.' },
              { icon: Landmark, text: 'Compliance — we encourage RERA and document checks on every deal.' },
            ].map((v) => (
              <li key={v.text} className="flex items-start gap-3 text-secondary">
                <v.icon size={18} className="text-[var(--color-accent)] shrink-0 mt-0.5" /> {v.text}
              </li>
            ))}
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
      <section className="mb-12" aria-labelledby="services-heading">
        <div className="mb-6">
          <h2 id="services-heading" className="text-2xl md:text-3xl font-bold">What we do</h2>
          <p className="text-secondary mt-1">Everything you need from first search to final paperwork.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((s) => (
            <GlassCard key={s.title} className="p-6">
              <div className="w-11 h-11 rounded-full glass-weak flex items-center justify-center mb-4">
                <s.icon size={20} className="text-[var(--color-accent)]" />
              </div>
              <h3 className="font-semibold text-lg mb-1.5">{s.title}</h3>
              <p className="text-secondary text-sm leading-relaxed">{s.desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Verification */}
      <section className="mb-12" aria-labelledby="verify-heading">
        <div className="mb-6">
          <h2 id="verify-heading" className="text-2xl md:text-3xl font-bold">How we keep listings trustworthy</h2>
          <p className="text-secondary mt-1">Trust is earned in the details. Here is what is built into the platform.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {verification.map((v) => (
            <GlassCard key={v.title} hover={false} className="p-6 flex gap-4">
              <BadgeCheck className="text-[var(--color-success)] shrink-0" size={24} />
              <div>
                <h3 className="font-semibold mb-1">{v.title}</h3>
                <p className="text-secondary text-sm leading-relaxed">{v.desc}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Live numbers */}
      <section className="mb-12" aria-labelledby="numbers-heading">
        <h2 id="numbers-heading" className="text-2xl md:text-3xl font-bold mb-2">The platform today</h2>
        <p className="text-secondary mb-6">Live figures from our own inventory — updated automatically as listings change.</p>
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
      <section className="mb-12" aria-labelledby="cities-heading">
        <h2 id="cities-heading" className="text-2xl md:text-3xl font-bold mb-6">Cities we serve</h2>
        <div className="flex flex-wrap gap-3">
          {cities.map((c) => (
            <Link
              key={c}
              to={`/listings?purpose=Buy&city=${encodeURIComponent(c)}`}
              className="glass px-5 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium spring hover:scale-105"
            >
              <MapPin size={15} /> Property in {c}
            </Link>
          ))}
        </div>
      </section>

      {/* Compliance */}
      <section className="mb-12" aria-labelledby="compliance-heading">
        <GlassCard hover={false} className="p-8">
          <h2 id="compliance-heading" className="text-2xl font-bold mb-3">Compliance & disclosures</h2>
          <ul className="flex flex-col gap-2 text-secondary text-sm leading-relaxed list-disc pl-5">
            {COMPANY.reraAgentId && <li>RERA agent registration number: <strong className="text-primary">{COMPANY.reraAgentId}</strong></li>}
            <li>{COMPANY.name} acts as an intermediary between buyers, tenants, owners and developers. Final terms are agreed directly between the parties.</li>
            <li>Prices, availability and specifications can change. Always verify RERA registration and ownership documents before making any payment.</li>
            <li>Content on this website is for general information and is not legal, tax or financial advice.</li>
          </ul>
        </GlassCard>
      </section>

      {/* FAQ */}
      <section className="mb-12 max-w-3xl" aria-labelledby="about-faq-heading">
        <h2 id="about-faq-heading" className="text-2xl md:text-3xl font-bold mb-5">About us — FAQs</h2>
        <div className="flex flex-col gap-3">
          {faqs.map((f) => (
            <GlassCard key={f.question} hover={false} className="p-5">
              <h3 className="font-semibold mb-1.5">{f.question}</h3>
              <p className="text-secondary text-sm leading-relaxed">{f.answer}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <GlassCard hover={false} strong className="p-8 md:p-12 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">Let’s find your next property</h2>
        <p className="text-secondary max-w-lg mx-auto mb-6">Tell us what you’re looking for and our team will help — no pressure, no obligation.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/contact"><GlassButton className="w-full justify-center">Contact Us</GlassButton></Link>
          <Link to="/blog"><GlassButton variant="glass" className="w-full justify-center">Read Buyer Guides</GlassButton></Link>
        </div>
      </GlassCard>
    </div>
  )
}
