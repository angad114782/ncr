import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Clock, Mail, MapPin, MessageCircle, Phone, Send, User } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassInput from '../../components/glass/GlassInput'
import GlassButton from '../../components/glass/GlassButton'
import FAQSection from '../../components/home/FAQSection'
import Seo from '../../components/layout/Seo'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { useSettings } from '../../context/SettingsContext'
import { useInterest } from '../../context/InterestContext'
import { USE_API } from '../../api/client'
import { formatAddress, hasAddress } from '../../data/company'
import { SITE_URL, breadcrumbLd, organizationLd } from '../../utils/seo'

export default function Contact() {
  const { whatsappConfig, mailConfig, cities, fireLeadEvent, company, siteContent, fill } = useSettings()
  const { addInquiry, submitLead } = useData()
  const { user } = useAuth()
  const { profile } = useInterest()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const c = siteContent.contact
  const intents = c.intents.filter((i) => i.value && i.label)

  const requested = params.get('intent')
  const initialIntent = intents.some((i) => i.value === requested) ? requested : intents[0]?.value ?? ''
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    intent: initialIntent,
    city: '',
    message: '',
  })
  useEffect(() => {
    if (!user) return
    setForm((f) => ({ ...f, name: f.name || user.name || '', phone: f.phone || user.phone || '', email: f.email || user.email || '' }))
  }, [user])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const digits = whatsappConfig.displayPhone.replace(/\D/g, '')
  const address = formatAddress(company.address)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.name.trim().length < 2) return setError('Please enter your name.')
    if (!/^\d{10}$/.test(form.phone)) return setError('Enter a valid 10-digit mobile number.')

    const intentLabel = fill(intents.find((i) => i.value === form.intent)?.label ?? 'Enquiry')
    if (USE_API) {
      setBusy(true)
      try {
        await submitLead({
          name: form.name.trim(),
          phone: form.phone,
          email: form.email.trim() || undefined,
          city: form.city || undefined,
          contactIntent: form.intent,
          source: 'contact_page',
          message: `[${intentLabel}${form.city ? ` · ${form.city}` : ''}] ${form.message.trim() || 'No additional message.'}`,
          profile,
        })
      } catch (err) {
        setBusy(false)
        return setError(err.message)
      }
      fireLeadEvent('contact_form')
      navigate('/thank-you', { state: { leadName: form.name.trim() } })
      return
    }
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
    { icon: MessageCircle, title: 'WhatsApp', value: 'Chat with our team', href: `https://wa.me/91${digits}?text=${encodeURIComponent(fill(c.waEnquiry))}`, external: true },
    { icon: Mail, title: 'Email us', value: mailConfig.fromEmail, href: `mailto:${mailConfig.fromEmail}` },
    ...(hasAddress(company.address)
      ? [{ icon: MapPin, title: 'Visit us', value: address, href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, external: true }]
      : []),
    ...(company.officeHours ? [{ icon: Clock, title: 'Office hours', value: company.officeHours }] : []),
  ]

  return (
    <div className="pb-16">
      <Seo
        title={`Contact ${company.name} — Talk to a Property Expert`}
        description={`Call, WhatsApp or email ${company.name} to buy, rent or sell property across India. Free guidance from a team led by ${company.ceo.name}. We aim to respond within 24 hours.`}
        path="/contact"
        jsonLd={[
          breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact' }]),
          {
            '@context': 'https://schema.org',
            '@type': 'ContactPage',
            url: `${SITE_URL}/contact`,
            name: `Contact ${company.name}`,
            mainEntity: organizationLd({ company, phone: whatsappConfig.displayPhone, email: mailConfig.fromEmail, cities }),
          },
        ]}
      />

      <div className="text-center mb-10 max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-bold mb-3">{fill(c.title)}</h1>
        <p className="text-secondary text-base md:text-lg">{fill(c.subtitle)}</p>
      </div>

      <div className={`grid grid-cols-1 gap-5 mb-10 sm:grid-cols-2 ${cards.length > 3 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {cards.map((card) => {
          const Body = (
            <GlassCard className="p-6 text-center h-full">
              <card.icon className="mx-auto mb-2 text-[var(--color-accent)]" size={24} />
              <h2 className="font-semibold">{card.title}</h2>
              <p className="text-secondary text-sm break-words">{card.value}</p>
            </GlassCard>
          )
          return card.href ? (
            <a key={card.title} href={card.href} {...(card.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{Body}</a>
          ) : (
            <div key={card.title}>{Body}</div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-12">
        <GlassCard hover={false} strong className="p-6 md:p-8 lg:col-span-3 min-w-0">
          <h2 className="text-2xl font-bold mb-1">{fill(c.formTitle)}</h2>
          <p className="text-secondary text-sm mb-5">{fill(c.formSubtitle)}</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GlassInput as="select" label="I’m interested in" value={form.intent} onChange={(e) => setForm({ ...form, intent: e.target.value })}>
                {intents.map((i) => <option key={i.value} value={i.value}>{fill(i.label)}</option>)}
              </GlassInput>
              <GlassInput as="select" label="City" icon={MapPin} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                <option value="">Any city</option>
                {cities.map((city) => <option key={city} value={city}>{city}</option>)}
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

            <GlassButton type="submit" disabled={busy} className="w-full justify-center"><Send size={16} /> {c.buttonLabel}</GlassButton>
            {c.buttonNote && <p className="text-tertiary text-xs text-center">{c.buttonNote}</p>}
          </form>
        </GlassCard>

        <div className="lg:col-span-2 flex flex-col gap-5 min-w-0">
          {c.steps.length > 0 && (
            <GlassCard hover={false} className="p-6">
              <h2 className="text-xl font-bold mb-4">{fill(c.stepsTitle)}</h2>
              <ol className="flex flex-col gap-4">
                {c.steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-7 h-7 rounded-full bg-[var(--color-accent)] text-white text-sm font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <div>
                      <p className="font-semibold">{s.title}</p>
                      <p className="text-secondary text-sm leading-relaxed">{fill(s.desc)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </GlassCard>
          )}

          <GlassCard hover={false} className="p-6">
            <p className="text-tertiary text-xs uppercase font-semibold mb-2">Who you’ll be talking to</p>
            <p className="font-semibold">{company.ceo.name}, {company.ceo.title}</p>
            <p className="text-secondary text-sm leading-relaxed mb-3">
              {company.ceo.experienceYears}+ years of real estate experience, backed by a team of approved property consultants.
            </p>
            <Link to="/team" className="text-sm font-medium text-[var(--color-accent)]">Meet our team →</Link>
          </GlassCard>
        </div>
      </div>

      <FAQSection page="contact" title="Contact — FAQs" subtitle="" className="max-w-3xl mx-auto" />
    </div>
  )
}
