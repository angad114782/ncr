import { createContext, useContext } from 'react'
import usePersistedState from '../hooks/usePersistedState'
import { fireLeadEvent as fireLeadEventUtil } from '../utils/tracking'
import { COMPANY_DEFAULTS } from '../data/company'
import { SITE_DEFAULTS, fillTokens } from '../data/siteDefaults'
import { DEFAULT_CITIES, DEFAULT_PROPERTY_TYPES } from '../data/taxonomy'

const SettingsContext = createContext(null)

const DEFAULT_WHATSAPP_CONFIG = {
  displayPhone: '8619930583',
  phoneNumberId: '',
  businessAccountId: '',
  accessToken: '',
  otpTemplate: 'otp_verification',
  leadNotificationTemplate: 'lead_notification',
  leadThankYouTemplate: 'lead_thank_you',
  webhookVerifyToken: '',
}

const DEFAULT_MAIL_CONFIG = {
  smtpHost: '',
  smtpPort: '587',
  smtpUsername: 'info@propertyinncr.com',
  smtpPassword: '',
  encryption: 'TLS',
  fromEmail: 'info@propertyinncr.com',
  fromName: 'NCR Estates',
  replyTo: 'info@propertyinncr.com',
}

const DEFAULT_MARKETING_CONFIG = {
  metaPixelId: '',
  googleAdsId: '',
  googleAdsConversionLabel: '',
}


const DEFAULT_TOP_BANNER = {
  enabled: false,
  text: '',
  linkLabel: '',
  link: '',
}

// Running strip between the navbar and the hero. The starter messages are plain,
// truthful nudges — swap in real offers in Admin → Settings. Avoid invented scarcity
// ("only 2 flats left!") unless it is actually true.
const DEFAULT_TICKER = {
  enabled: true,
  speed: 'normal', // 'slow' | 'normal' | 'fast'
  messages: [
    { text: 'Free site visits — no obligation, no pressure', link: '/contact?intent=buy' },
    { text: 'Check RERA before you pay — read our free 2-minute guide', link: '/blog/how-to-check-rera-registration' },
    { text: 'Not sure of your budget? Get a free home-loan estimate', link: '/' },
    { text: 'Want us to call you back? Talk to an expert today', link: '/contact' },
  ],
}

export function SettingsProvider({ children }) {
  const [whatsappConfig, setWhatsappConfig] = usePersistedState('re-whatsapp-config', DEFAULT_WHATSAPP_CONFIG, { merge: true })
  const [mailConfig, setMailConfig] = usePersistedState('re-mail-config', DEFAULT_MAIL_CONFIG, { merge: true })
  const [marketingConfig, setMarketingConfig] = usePersistedState('re-marketing-config', DEFAULT_MARKETING_CONFIG, { merge: true })
  const [cities, setCities] = usePersistedState('re-cities', DEFAULT_CITIES)
  const [propertyTypes, setPropertyTypes] = usePersistedState('re-property-types', DEFAULT_PROPERTY_TYPES)
  const [topBanner, setTopBanner] = usePersistedState('re-top-banner', DEFAULT_TOP_BANNER, { merge: true })
  const [ticker, setTicker] = usePersistedState('re-ticker', DEFAULT_TICKER, { merge: true })
  const [company, setCompany] = usePersistedState('re-company', COMPANY_DEFAULTS, { merge: true })
  const [siteContent, setSiteContent] = usePersistedState('re-site-content', SITE_DEFAULTS, { merge: true })

  const updateWhatsappConfig = (patch) => setWhatsappConfig((prev) => ({ ...prev, ...patch }))
  const updateMailConfig = (patch) => setMailConfig((prev) => ({ ...prev, ...patch }))
  const updateMarketingConfig = (patch) => setMarketingConfig((prev) => ({ ...prev, ...patch }))
  const updateTopBanner = (patch) => setTopBanner((prev) => ({ ...prev, ...patch }))
  const updateTicker = (patch) => setTicker((prev) => ({ ...prev, ...patch }))

  const addCity = (name) => {
    const clean = name.trim()
    if (!clean || cities.some((c) => c.toLowerCase() === clean.toLowerCase())) return
    setCities((prev) => [...prev, clean])
  }
  const removeCity = (name) => setCities((prev) => prev.filter((c) => c !== name))

  const addPropertyType = (name) => {
    const clean = name.trim()
    if (!clean || propertyTypes.some((t) => t.toLowerCase() === clean.toLowerCase())) return
    setPropertyTypes((prev) => [...prev, clean])
  }
  const removePropertyType = (name) => setPropertyTypes((prev) => prev.filter((t) => t !== name))

  const fireLeadEvent = (formName, extra) => fireLeadEventUtil(marketingConfig, formName, extra)

  /** Replace {brand} {ceoName} {ceoTitle} {years} in admin-written copy. */
  const fill = (text) => fillTokens(text, company)

  return (
    <SettingsContext.Provider
      value={{
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
        company,
        setCompany,
        resetCompany: () => setCompany(COMPANY_DEFAULTS),
        siteContent,
        setSiteContent,
        resetSiteContent: () => setSiteContent(SITE_DEFAULTS),
        fill,
        fireLeadEvent,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
