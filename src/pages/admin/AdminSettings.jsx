import { useState } from 'react'
import {
  BarChart3,
  Building2,
  Check,
  Contact as ContactIcon,
  Eye,
  EyeOff,
  Hash,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Megaphone,
  Phone,
  Send,
  Server,
  ShieldCheck,
  Tag,
  Type,
  Plus,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassInput from '../../components/glass/GlassInput'
import GlassButton from '../../components/glass/GlassButton'
import PromoTicker from '../../components/home/PromoTicker'
import { useSettings } from '../../context/SettingsContext'

const encryptionOptions = ['TLS', 'SSL', 'None']

export default function AdminSettings() {
  const {
    whatsappConfig,
    mailConfig,
    marketingConfig,
    updateWhatsappConfig,
    updateMailConfig,
    updateMarketingConfig,
    cities,
    propertyTypes,
    addCity,
    removeCity,
    addPropertyType,
    removePropertyType,
    topBanner,
    updateTopBanner,
    ticker,
    updateTicker,
  } = useSettings()

  const [newCity, setNewCity] = useState('')
  const [newType, setNewType] = useState('')

  const [contactForm, setContactForm] = useState({ phone: whatsappConfig.displayPhone, email: mailConfig.fromEmail })
  const [waForm, setWaForm] = useState(whatsappConfig)
  const [mailForm, setMailForm] = useState(mailConfig)
  const [marketingForm, setMarketingForm] = useState(marketingConfig)
  const [bannerForm, setBannerForm] = useState(topBanner)
  const [bannerSaved, setBannerSaved] = useState(false)
  const [tickerForm, setTickerForm] = useState(ticker)
  const [tickerSaved, setTickerSaved] = useState(false)

  const [showToken, setShowToken] = useState(false)
  const [showSmtpPassword, setShowSmtpPassword] = useState(false)

  const [contactSaved, setContactSaved] = useState(false)
  const [waSaved, setWaSaved] = useState(false)
  const [mailSaved, setMailSaved] = useState(false)
  const [marketingSaved, setMarketingSaved] = useState(false)

  const handleContactSave = (e) => {
    e.preventDefault()
    updateWhatsappConfig({ displayPhone: contactForm.phone })
    updateMailConfig({ fromEmail: contactForm.email, smtpUsername: contactForm.email, replyTo: contactForm.email })
    setWaForm((f) => ({ ...f, displayPhone: contactForm.phone }))
    setMailForm((f) => ({ ...f, fromEmail: contactForm.email, smtpUsername: contactForm.email, replyTo: contactForm.email }))
    setContactSaved(true)
    setTimeout(() => setContactSaved(false), 2000)
  }

  const handleBannerSave = (e) => {
    e.preventDefault()
    updateTopBanner(bannerForm)
    setBannerSaved(true)
    setTimeout(() => setBannerSaved(false), 2000)
  }

  const setTickerMessage = (i, patch) =>
    setTickerForm((f) => ({ ...f, messages: f.messages.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) }))
  const addTickerMessage = () =>
    setTickerForm((f) => (f.messages.length >= 10 ? f : { ...f, messages: [...f.messages, { text: '', link: '' }] }))
  const removeTickerMessage = (i) =>
    setTickerForm((f) => ({ ...f, messages: f.messages.filter((_, idx) => idx !== i) }))

  const handleTickerSave = (e) => {
    e.preventDefault()
    // Drop empty rows so the saved strip never has blank gaps.
    updateTicker({ ...tickerForm, messages: tickerForm.messages.filter((m) => m.text.trim()).map((m) => ({ text: m.text.trim(), link: m.link.trim() })) })
    setTickerSaved(true)
    setTimeout(() => setTickerSaved(false), 2000)
  }

  const handleWaSave = (e) => {
    e.preventDefault()
    updateWhatsappConfig(waForm)
    setContactForm((f) => ({ ...f, phone: waForm.displayPhone }))
    setWaSaved(true)
    setTimeout(() => setWaSaved(false), 2000)
  }

  const handleMailSave = (e) => {
    e.preventDefault()
    updateMailConfig(mailForm)
    setContactForm((f) => ({ ...f, email: mailForm.fromEmail }))
    setMailSaved(true)
    setTimeout(() => setMailSaved(false), 2000)
  }

  const handleMarketingSave = (e) => {
    e.preventDefault()
    updateMarketingConfig(marketingForm)
    setMarketingSaved(true)
    setTimeout(() => setMarketingSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1">Settings</h1>
        <p className="text-secondary">Site contact info, integrations, and ad tracking.</p>
      </div>

      {/* Site Contact Info — the number/email shown across the public site */}
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-9 h-9 rounded-[12px] bg-[var(--color-accent)] flex items-center justify-center text-white shrink-0">
            <ContactIcon size={16} />
          </span>
          <h2 className="font-semibold text-lg">Site Contact Info</h2>
        </div>
        <p className="text-secondary text-sm mb-5">
          The mobile number and email shown across the website — Call/WhatsApp buttons, the Contact page, and inquiry replies.
        </p>

        <form onSubmit={handleContactSave} className="grid sm:grid-cols-2 gap-3.5 sm:items-end">
          <GlassInput
            label="Mobile Number"
            icon={Phone}
            placeholder="8619930583"
            value={contactForm.phone}
            onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
          />
          <GlassInput
            label="Email Address"
            icon={Mail}
            type="email"
            placeholder="info@propertyinncr.com"
            value={contactForm.email}
            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
          />
          <GlassButton type="submit" className="sm:col-span-2 justify-center">
            {contactSaved ? <><Check size={16} /> Saved</> : 'Save Contact Info'}
          </GlassButton>
        </form>
      </GlassCard>

      {/* Cities & Property Types — the taxonomy that drives search filters,
          the home page city/type pickers, and the footer's link silos. Editing
          here updates the whole site immediately instead of needing a code change. */}
      <div className="grid md:grid-cols-2 gap-6">
        <TaxonomyEditor
          title="Cities"
          description="Cities shown in search, filters, and Explore by City. Removing a city here doesn't touch existing listings in that city."
          icon={MapPin}
          items={cities}
          value={newCity}
          onChange={setNewCity}
          onAdd={() => { addCity(newCity); setNewCity('') }}
          onRemove={removeCity}
          placeholder="e.g. Kolkata"
        />
        <TaxonomyEditor
          title="Property Types"
          description="Types available when adding a listing, and the quick-filter pills on the home page."
          icon={Building2}
          items={propertyTypes}
          value={newType}
          onChange={setNewType}
          onAdd={() => { addPropertyType(newType); setNewType('') }}
          onRemove={removePropertyType}
          placeholder="e.g. Farmhouse"
        />
      </div>

      {/* Top Announcement Banner — a dismissible strip shown above the navbar
          on every public page. Dismissal is keyed to the exact text, so
          editing the message here brings it back even for visitors who
          already closed the old one. */}
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-[12px] bg-[var(--color-accent)] flex items-center justify-center text-white shrink-0">
              <Megaphone size={16} />
            </span>
            <h2 className="font-semibold text-lg">Top Banner</h2>
          </div>
          <button
            type="button"
            onClick={() => setBannerForm((f) => ({ ...f, enabled: !f.enabled }))}
            className={`relative w-12 h-7 rounded-full spring shrink-0 ${
              bannerForm.enabled ? 'bg-[var(--color-success)]' : 'bg-[var(--glass-surface-strong)]'
            }`}
            aria-label={bannerForm.enabled ? 'Disable banner' : 'Enable banner'}
          >
            <span
              className="absolute top-1 w-5 h-5 rounded-full bg-white shadow spring"
              style={{ left: bannerForm.enabled ? '26px' : '4px' }}
            />
          </button>
        </div>
        <p className="text-secondary text-sm mb-5">
          A dismissible strip shown above the menu bar on every public page — for offers, announcements, or a seasonal promo.
        </p>

        <form onSubmit={handleBannerSave} className="flex flex-col gap-3.5">
          <GlassInput
            label="Message"
            icon={Type}
            placeholder="e.g. 🎉 Zero brokerage on all rentals this month!"
            value={bannerForm.text}
            onChange={(e) => setBannerForm({ ...bannerForm, text: e.target.value })}
          />
          <div className="grid sm:grid-cols-2 gap-3.5">
            <GlassInput
              label="Link Label (optional)"
              icon={Tag}
              placeholder="e.g. Learn More"
              value={bannerForm.linkLabel}
              onChange={(e) => setBannerForm({ ...bannerForm, linkLabel: e.target.value })}
            />
            <GlassInput
              label="Link URL (optional)"
              icon={Link2}
              placeholder="/listings?purpose=Rent or https://..."
              value={bannerForm.link}
              onChange={(e) => setBannerForm({ ...bannerForm, link: e.target.value })}
            />
          </div>

          {bannerForm.enabled && bannerForm.text.trim() && (
            <div className="rounded-[14px] overflow-hidden">
              <div className="bg-[var(--color-accent)] text-white text-sm font-medium flex items-center justify-center gap-2 px-8 py-2.5 relative">
                <span className="truncate">{bannerForm.text}</span>
                {bannerForm.link && bannerForm.linkLabel && (
                  <span className="underline underline-offset-2 font-semibold shrink-0">{bannerForm.linkLabel}</span>
                )}
                <span className="absolute right-2 w-6 h-6 rounded-full flex items-center justify-center">
                  <X size={13} />
                </span>
              </div>
            </div>
          )}

          <GlassButton type="submit" className="w-full justify-center mt-1">
            {bannerSaved ? <><Check size={16} /> Saved</> : 'Save Banner'}
          </GlassButton>
        </form>
      </GlassCard>

      {/* Running Strip — scrolling ticker between the navbar and the home hero. */}
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-[12px] bg-[var(--color-accent)] flex items-center justify-center text-white shrink-0">
              <Sparkles size={16} />
            </span>
            <h2 className="font-semibold text-lg">Running Strip</h2>
          </div>
          <button
            type="button"
            onClick={() => setTickerForm((f) => ({ ...f, enabled: !f.enabled }))}
            className={`relative w-12 h-7 rounded-full spring shrink-0 ${
              tickerForm.enabled ? 'bg-[var(--color-success)]' : 'bg-[var(--glass-surface-strong)]'
            }`}
            aria-label={tickerForm.enabled ? 'Disable running strip' : 'Enable running strip'}
          >
            <span
              className="absolute top-1 w-5 h-5 rounded-full bg-white shadow spring"
              style={{ left: tickerForm.enabled ? '26px' : '4px' }}
            />
          </button>
        </div>
        <p className="text-secondary text-sm mb-5">
          A scrolling strip of short messages between the menu bar and the hero section on the home page — use it for
          offers, reassurance and nudges (e.g. “Free site visits — no obligation”). Keep it truthful: real offers convert
          better and protect trust. Pauses when a visitor hovers over it.
        </p>

        <form onSubmit={handleTickerSave} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-3">
            {tickerForm.messages.map((m, i) => (
              <div key={i} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <GlassInput
                  label={i === 0 ? 'Message' : undefined}
                  icon={Type}
                  placeholder="e.g. Zero brokerage on rentals this month"
                  maxLength={120}
                  value={m.text}
                  onChange={(e) => setTickerMessage(i, { text: e.target.value })}
                />
                <GlassInput
                  label={i === 0 ? 'Link (optional)' : undefined}
                  icon={Link2}
                  placeholder="/listings?purpose=Rent or https://…"
                  value={m.link}
                  onChange={(e) => setTickerMessage(i, { link: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removeTickerMessage(i)}
                  aria-label={`Remove message ${i + 1}`}
                  className="glass w-12 h-12 rounded-[14px] flex items-center justify-center spring hover:scale-105 text-[var(--color-danger)]"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {tickerForm.messages.length === 0 && <p className="text-tertiary text-sm">No messages yet — add one below.</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <GlassButton type="button" variant="glass" size="sm" icon={Plus} onClick={addTickerMessage} disabled={tickerForm.messages.length >= 10}>
              Add message
            </GlassButton>
            <div className="glass-weak p-1 rounded-full flex">
              {['slow', 'normal', 'fast'].map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => setTickerForm((f) => ({ ...f, speed: sp }))}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize spring ${
                    tickerForm.speed === sp ? 'glass-strong text-[var(--color-accent)]' : 'text-secondary'
                  }`}
                >
                  {sp}
                </button>
              ))}
            </div>
            <span className="text-tertiary text-xs">Up to 10 messages · speed</span>
          </div>

          <div>
            <p className="text-tertiary text-xs uppercase font-semibold mb-2">Live preview</p>
            {tickerForm.enabled && tickerForm.messages.some((m) => m.text.trim()) ? (
              <PromoTicker config={tickerForm} className="!mb-0" />
            ) : (
              <p className="text-tertiary text-sm glass-weak rounded-[14px] px-4 py-3">Strip is off or empty — visitors won’t see it.</p>
            )}
          </div>

          <GlassButton type="submit" className="w-full justify-center mt-1">
            {tickerSaved ? <><Check size={16} /> Saved</> : 'Save Running Strip'}
          </GlassButton>
        </form>
      </GlassCard>

      {/* Marketing & Ad Tracking — real, live client-side integrations */}
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-9 h-9 rounded-[12px] bg-[var(--color-accent-2)] flex items-center justify-center text-white shrink-0">
            <BarChart3 size={16} />
          </span>
          <h2 className="font-semibold text-lg">Marketing &amp; Ad Tracking</h2>
        </div>
        <p className="text-secondary text-sm mb-5">
          Meta Pixel and Google Ads IDs — unlike WhatsApp/Mail below, these load for real as soon as you save them, and
          fire a Lead/conversion event whenever a visitor submits the inquiry, contact, or signup form.
        </p>

        <form onSubmit={handleMarketingSave} className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-secondary px-1">Meta Pixel ID</span>
            <StatusBadge active={!!marketingConfig.metaPixelId} />
          </div>
          <GlassInput
            icon={MessageCircle}
            placeholder="e.g. 1234567890123456"
            value={marketingForm.metaPixelId}
            onChange={(e) => setMarketingForm({ ...marketingForm, metaPixelId: e.target.value.trim() })}
          />

          <div className="flex items-center justify-between mt-1">
            <span className="text-sm font-medium text-secondary px-1">Google Ads Conversion ID</span>
            <StatusBadge active={!!marketingForm.googleAdsId} />
          </div>
          <GlassInput
            icon={Tag}
            placeholder="AW-XXXXXXXXX"
            value={marketingForm.googleAdsId}
            onChange={(e) => setMarketingForm({ ...marketingForm, googleAdsId: e.target.value.trim() })}
          />
          <GlassInput
            label="Google Ads Conversion Label"
            icon={Hash}
            placeholder="Optional — needed to track a specific conversion action"
            value={marketingForm.googleAdsConversionLabel}
            onChange={(e) => setMarketingForm({ ...marketingForm, googleAdsConversionLabel: e.target.value.trim() })}
          />

          <GlassButton type="submit" className="w-full justify-center mt-2">
            {marketingSaved ? <><Check size={16} /> Saved</> : 'Save Tracking Config'}
          </GlassButton>
        </form>
      </GlassCard>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* WhatsApp Cloud API Config */}
        <GlassCard hover={false} className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-9 h-9 rounded-[12px] flex items-center justify-center text-white shrink-0" style={{ background: '#25D366' }}>
              <MessageCircle size={17} />
            </span>
            <h2 className="font-semibold text-lg">WhatsApp Config</h2>
          </div>
          <p className="text-secondary text-sm mb-5">
            Credentials from your Meta WhatsApp Cloud API app. Powers the Call/WhatsApp buttons now, and once a
            server is wired up, sends the <span className="text-primary font-medium">OTP</span> template to verify a
            mobile number (login, signup, and the lead form), the <span className="text-primary font-medium">Lead Notification</span> template
            to you the moment a lead is verified, and the <span className="text-primary font-medium">Lead Thank You</span> template
            to the lead themselves.
          </p>

          <form onSubmit={handleWaSave} className="flex flex-col gap-3.5">
            <GlassInput
              label="Display Phone Number"
              icon={Phone}
              placeholder="8619930583"
              value={waForm.displayPhone}
              onChange={(e) => setWaForm({ ...waForm, displayPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            />
            <GlassInput
              label="Phone Number ID"
              icon={Hash}
              placeholder="e.g. 109876543210987"
              value={waForm.phoneNumberId}
              onChange={(e) => setWaForm({ ...waForm, phoneNumberId: e.target.value })}
            />
            <GlassInput
              label="WhatsApp Business Account ID"
              icon={Hash}
              placeholder="e.g. 123456789012345"
              value={waForm.businessAccountId}
              onChange={(e) => setWaForm({ ...waForm, businessAccountId: e.target.value })}
            />
            <GlassInput
              label="Access Token"
              icon={showToken ? EyeOff : Eye}
              type={showToken ? 'text' : 'password'}
              placeholder="EAAG..."
              value={waForm.accessToken}
              onChange={(e) => setWaForm({ ...waForm, accessToken: e.target.value })}
              onIconClick={() => setShowToken((v) => !v)}
            />
            <GlassInput
              label="OTP Template"
              icon={ShieldCheck}
              placeholder="e.g. otp_verification"
              value={waForm.otpTemplate}
              onChange={(e) => setWaForm({ ...waForm, otpTemplate: e.target.value })}
            />
            <GlassInput
              label="Lead Notification Template"
              icon={Tag}
              placeholder="e.g. lead_notification"
              value={waForm.leadNotificationTemplate}
              onChange={(e) => setWaForm({ ...waForm, leadNotificationTemplate: e.target.value })}
            />
            <GlassInput
              label="Lead Thank You Template"
              icon={Tag}
              placeholder="e.g. lead_thank_you"
              value={waForm.leadThankYouTemplate}
              onChange={(e) => setWaForm({ ...waForm, leadThankYouTemplate: e.target.value })}
            />
            <GlassInput
              label="Webhook Verify Token"
              icon={Hash}
              placeholder="Optional — for inbound message webhooks"
              value={waForm.webhookVerifyToken}
              onChange={(e) => setWaForm({ ...waForm, webhookVerifyToken: e.target.value })}
            />

            <GlassButton type="submit" className="w-full justify-center mt-2">
              {waSaved ? <><Check size={16} /> Saved</> : 'Save WhatsApp Config'}
            </GlassButton>
          </form>
        </GlassCard>

        {/* Mail Config */}
        <GlassCard hover={false} className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-9 h-9 rounded-[12px] bg-[var(--color-accent)] flex items-center justify-center text-white shrink-0">
              <Send size={16} />
            </span>
            <h2 className="font-semibold text-lg">Mail Config</h2>
          </div>
          <p className="text-secondary text-sm mb-5">
            SMTP server settings — once a server is wired up, this is what sends the admin lead notification email
            and the confirmation email back to the lead, alongside inquiry notifications and account emails.
          </p>

          <form onSubmit={handleMailSave} className="flex flex-col gap-3.5">
            <GlassInput
              label="SMTP Host"
              icon={Server}
              placeholder="smtp.hostinger.com"
              value={mailForm.smtpHost}
              onChange={(e) => setMailForm({ ...mailForm, smtpHost: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3.5">
              <GlassInput
                label="SMTP Port"
                icon={Hash}
                placeholder="587"
                value={mailForm.smtpPort}
                onChange={(e) => setMailForm({ ...mailForm, smtpPort: e.target.value.replace(/\D/g, '').slice(0, 5) })}
              />
              <GlassInput
                as="select"
                label="Encryption"
                icon={ShieldCheck}
                value={mailForm.encryption}
                onChange={(e) => setMailForm({ ...mailForm, encryption: e.target.value })}
              >
                {encryptionOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </GlassInput>
            </div>
            <GlassInput
              label="SMTP Username"
              icon={User}
              placeholder="info@propertyinncr.com"
              value={mailForm.smtpUsername}
              onChange={(e) => setMailForm({ ...mailForm, smtpUsername: e.target.value })}
            />
            <GlassInput
              label="SMTP Password"
              icon={showSmtpPassword ? EyeOff : Eye}
              type={showSmtpPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={mailForm.smtpPassword}
              onChange={(e) => setMailForm({ ...mailForm, smtpPassword: e.target.value })}
              onIconClick={() => setShowSmtpPassword((v) => !v)}
            />
            <GlassInput
              label="From Email"
              icon={Mail}
              type="email"
              placeholder="info@propertyinncr.com"
              value={mailForm.fromEmail}
              onChange={(e) => setMailForm({ ...mailForm, fromEmail: e.target.value })}
            />
            <GlassInput
              label="From Name"
              icon={User}
              placeholder="NCR Estates"
              value={mailForm.fromName}
              onChange={(e) => setMailForm({ ...mailForm, fromName: e.target.value })}
            />
            <GlassInput
              label="Reply-To Email"
              icon={Mail}
              type="email"
              placeholder="info@propertyinncr.com"
              value={mailForm.replyTo}
              onChange={(e) => setMailForm({ ...mailForm, replyTo: e.target.value })}
            />

            <GlassButton type="submit" className="w-full justify-center mt-2">
              {mailSaved ? <><Check size={16} /> Saved</> : 'Save Mail Config'}
            </GlassButton>
          </form>
        </GlassCard>
      </div>

      <GlassCard hover={false} className="p-5">
        <p className="text-tertiary text-xs leading-relaxed">
          The WhatsApp Cloud API and SMTP fields below are stored locally in this browser for demo purposes only —
          this project has no backend yet, so no WhatsApp template messages or SMTP emails are actually sent yet
          (sending a real email needs a server — a browser can't speak SMTP directly, and calling the WhatsApp Cloud
          API straight from the browser would expose your access token to anyone viewing the page). Once a server is
          wired up, these fields map directly onto the Meta WhatsApp Cloud API (phone number ID, WABA ID, access
          token, and the OTP/Lead Notification/Lead Thank You templates) and a standard SMTP mail server (host, port,
          username, password, encryption) respectively — together they'll deliver real OTPs plus the lead
          notification and thank-you message on both channels. The Meta Pixel and Google Ads fields above are the
          exception — those run entirely in the browser and are genuinely live already.
        </p>
      </GlassCard>
    </div>
  )
}

function StatusBadge({ active }) {
  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full glass-weak ${
        active ? 'text-[var(--color-success)]' : 'text-tertiary'
      }`}
    >
      {active ? 'Active' : 'Not configured'}
    </span>
  )
}

function TaxonomyEditor({ title, description, icon: Icon, items, value, onChange, onAdd, onRemove, placeholder }) {
  const handleSubmit = (e) => {
    e.preventDefault()
    onAdd()
  }

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-9 h-9 rounded-[12px] bg-[var(--color-accent)] flex items-center justify-center text-white shrink-0">
          <Icon size={16} />
        </span>
        <h2 className="font-semibold text-lg">{title}</h2>
      </div>
      <p className="text-secondary text-sm mb-5">{description}</p>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <div className="flex-1">
          <GlassInput placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
        <GlassButton type="submit" size="md" disabled={!value.trim()}>
          Add
        </GlassButton>
      </form>

      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="glass-weak rounded-full pl-3.5 pr-1.5 py-1.5 text-sm font-medium flex items-center gap-1.5"
          >
            {item}
            <button
              type="button"
              onClick={() => onRemove(item)}
              aria-label={`Remove ${item}`}
              className="w-5 h-5 rounded-full flex items-center justify-center text-tertiary hover:text-[var(--color-danger)] hover:bg-[var(--glass-surface-strong)] spring"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {items.length === 0 && <p className="text-tertiary text-sm">None yet — add one above.</p>}
      </div>
    </GlassCard>
  )
}
