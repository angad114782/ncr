import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Clock, Mail, MapPin, MessageCircle, Phone, Send, User } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassInput from '../../components/glass/GlassInput'
import GlassButton from '../../components/glass/GlassButton'
import Seo from '../../components/layout/Seo'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { useSettings } from '../../context/SettingsContext'
import { COMPANY, formatAddress, hasAddress } from '../../data/company'
import { SITE_URL, breadcrumbLd, faqLd, organizationLd } from '../../utils/seo'

const INTENTS = [
  { value: 'buy', label: 'I want to buy a property' },
  { value: 'rent', label: 'I want to rent a property' },
  { value: 'sell', label: 'I want to sell / list my property' },
  { value: 'loan', label: 'Home-loan & budget guidance' },
  { value: 'partner', label: 'Join / partner with NCR Estates' },
  { value: 'other', label: 'Something else' },
]

const steps = [
  { title: 'Send your requirement', desc: 'Share what you’re looking for — city, budget and property type help us the most.' },
  { title: 'We call you back', desc: 'A member of our team contacts you on the number you provide. We aim to respond within 24 hours.' },
  { title: 'Shortlist & site visits', desc: 'We share matching options and arrange visits — with no obligation to proceed.' },
]

const faqs = [
  { question: 'Is talking to your team free?', answer: 'Yes. Enquiring, getting recommendations and arranging site visits is free. If any brokerage applies to a deal, we explain it clearly before you proceed.' },
  { question: 'How quickly will someone respond?', answer: 'We aim to respond within 24 hours on working days. For urgent requirements, call or WhatsApp us directly.' },
  { question: 'Can I list my property with you?', answer: 'Yes. Choose “I want to sell / list my property” in the form, add the city and a few details, and our team will call you.' },
  { question: 'Do I need to create an account to contact you?', answer: 'No. You only need your name and mobile number. Creating an account is optional and lets you save properties and track enquiries.' },
]

export default function Contact() {
  const { whatsappConfig, mailConfig, cities, fireLeadEvent } = useSettings()
  const { addInquiry } = useData()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const initialIntent = INTENTS.some((i) => i.value === params.get('intent')) ? params.get('intent') : 'buy'
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    intent: initialIntent,
    city: '',
    message: '',
  })
  const [error, setError] = useState('')

  const digits = whatsappConfig.displayPhone.replace(/\D/g, '')
  const address = formatAddress()

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (form.name.trim().length < 2) return setError('Please enter your name.')
    if (!/^\d{10}$/.test(form.phone)) return setError('Enter a valid 10-digit mobile number.')

    const intentLabel = INTENTS.find((i) => i.value === form.intent)?.label ?? 'Enquiry'
    addInquiry({
      propertyId: null,
      userId: user?.id ?? null,
      userName: form.name.trim(),
      userEmail: form.email.trim(),
      phone: `+91 ${form.phone}`,
      intent: form.intent,
      city: form.city,
      source: 'contact_page',
      phoneVerified: false,
      message: `[${intentLabel}${form.city ? ` · ${form.city}` : ''}] ${form.message.trim() || 'No additional message.'}`,
    })
    fireLeadEvent('contact_form')
    navigate('/thank-you', { state: { leadName: form.name.trim() } })
  }

  const cards = [
    { icon: Phone, title: 'Call us', value: `+91 ${whatsappConfig.displayPhone}`, href: `tel:+91${digits}` },
    { icon: MessageCircle, title: 'WhatsApp', value: 'Chat with our team', href: `https://wa.me/91${digits}?text=${encodeURIComponent(`Hi! I’d like help with a property enquiry on ${COMPANY.name}.`)}`, external: true },
    { icon: Mail, title: 'Email us', value: mailConfig.fromEmail, href: `mailto:${mailConfig.fromEmail}` },
    ...(hasAddress()
      ? [{ icon: MapPin, title: 'Visit us', value: address, href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, external: true }]
      : []),
    ...(COMPANY.officeHours ? [{ icon: Clock, title: 'Office hours', value: COMPANY.officeHours }] : []),
  ]

  return (
    <div className="pb-16">
      <Seo
        title={`Contact ${COMPANY.name} — Talk to a Property Expert`}
        description={`Call, WhatsApp or email ${COMPANY.name} to buy, rent or sell property across India. Free guidance from a team led by ${COMPANY.ceo.name}. We aim to respond within 24 hours.`}
        path="/contact"
        jsonLd={[
          breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact' }]),
          {
            '@context': 'https://schema.org',
            '@type': 'ContactPage',
            url: `${SITE_URL}/contact`,
            name: `Contact ${COMPANY.name}`,
            mainEntity: organizationLd({ phone: whatsappConfig.displayPhone, email: mailConfig.fromEmail, cities }),
          },
          faqLd(faqs),
        ]}
      />

      <div className="text-center mb-10 max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-bold mb-3">Talk to a Property Expert</h1>
        <p className="text-secondary text-base md:text-lg">
          Buying, renting or selling? Tell us what you need and our team — led by {COMPANY.ceo.name} — will guide you.
          It’s free and there’s no obligation.
        </p>
      </div>

      <div className={`grid gap-5 mb-10 sm:grid-cols-2 ${cards.length > 3 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {cards.map((c) => {
          const Body = (
            <GlassCard className="p-6 text-center h-full">
              <c.icon className="mx-auto mb-2 text-[var(--color-accent)]" size={24} />
              <h2 className="font-semibold">{c.title}</h2>
              <p className="text-secondary text-sm break-words">{c.value}</p>
            </GlassCard>
          )
          return c.href ? (
            <a key={c.title} href={c.href} {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{Body}</a>
          ) : (
            <div key={c.title}>{Body}</div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-5 gap-6 mb-12">
        <GlassCard hover={false} strong className="p-6 md:p-8 lg:col-span-3">
          <h2 className="text-2xl font-bold mb-1">Send us your requirement</h2>
          <p className="text-secondary text-sm mb-5">We’ll call you on the number you share. Your details are only used to respond to your enquiry.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <GlassInput label="Full name" icon={User} placeholder="Your name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <GlassInput
                label="Mobile number"
                icon={Phone}
                type="tel"
                inputMode="numeric"
                placeholder="98XXXXXXXX"
                required
                maxLength={10}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              />
            </div>
            <GlassInput label="Email (optional)" icon={Mail} type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <div className="grid sm:grid-cols-2 gap-4">
              <GlassInput as="select" label="I’m interested in" value={form.intent} onChange={(e) => setForm({ ...form, intent: e.target.value })}>
                {INTENTS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
              </GlassInput>
              <GlassInput as="select" label="City" icon={MapPin} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                <option value="">Any city</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </GlassInput>
            </div>
            <GlassInput
              label="Message (optional)"
              as="textarea"
              rows={4}
              placeholder="Budget, preferred locality, BHK, timeline…"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />

            {error && <p className="text-[var(--color-danger)] text-sm px-1">{error}</p>}

            <GlassButton type="submit" className="w-full justify-center"><Send size={16} /> Get My Free Callback</GlassButton>
            <p className="text-tertiary text-xs text-center">Free · no obligation · we aim to call you back within 24 hours.</p>
          </form>
        </GlassCard>

        <div className="lg:col-span-2 flex flex-col gap-5">
          <GlassCard hover={false} className="p-6">
            <h2 className="text-xl font-bold mb-4">What happens next</h2>
            <ol className="flex flex-col gap-4">
              {steps.map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-[var(--color-accent)] text-white text-sm font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <div>
                    <p className="font-semibold">{s.title}</p>
                    <p className="text-secondary text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </GlassCard>

          <GlassCard hover={false} className="p-6">
            <p className="text-tertiary text-xs uppercase font-semibold mb-2">Who you’ll be talking to</p>
            <p className="font-semibold">{COMPANY.ceo.name}, {COMPANY.ceo.title}</p>
            <p className="text-secondary text-sm leading-relaxed mb-3">
              {COMPANY.ceo.experienceYears}+ years of real estate experience, backed by a team of approved property consultants.
            </p>
            <Link to="/team" className="text-sm font-medium text-[var(--color-accent)]">Meet our team →</Link>
          </GlassCard>
        </div>
      </div>

      <section className="max-w-3xl mx-auto" aria-labelledby="contact-faq-heading">
        <h2 id="contact-faq-heading" className="text-2xl md:text-3xl font-bold mb-5 text-center">Contact — FAQs</h2>
        <div className="flex flex-col gap-3">
          {faqs.map((f) => (
            <GlassCard key={f.question} hover={false} className="p-5">
              <h3 className="font-semibold mb-1.5">{f.question}</h3>
              <p className="text-secondary text-sm leading-relaxed">{f.answer}</p>
            </GlassCard>
          ))}
        </div>
      </section>
    </div>
  )
}
