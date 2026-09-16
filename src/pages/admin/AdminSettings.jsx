import { useState } from 'react'
import {
  BarChart3,
  Check,
  Contact as ContactIcon,
  Eye,
  EyeOff,
  Hash,
  Mail,
  MessageCircle,
  Phone,
  Send,
  Server,
  ShieldCheck,
  Tag,
  User,
} from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassInput from '../../components/glass/GlassInput'
import GlassButton from '../../components/glass/GlassButton'
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
  } = useSettings()

  const [contactForm, setContactForm] = useState({ phone: whatsappConfig.displayPhone, email: mailConfig.fromEmail })
  const [waForm, setWaForm] = useState(whatsappConfig)
  const [mailForm, setMailForm] = useState(mailConfig)
  const [marketingForm, setMarketingForm] = useState(marketingConfig)

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
