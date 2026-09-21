import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import usePersistedState, { deepMerge } from '../hooks/usePersistedState'
import { USE_API, api, reportApiError } from '../api/client'
import { useAuth } from './AuthContext'
import snapshot from '../data/snapshot.json'
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
  leadWelcomeEnabled: true,
  leadWelcomeVerifiedOnly: false,
  accountUpdateTemplate: '',
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
    { text: 'Free site visits — no obligation, no pressure', link: '/contact' },
    { text: 'Check RERA before you pay — read our free 2-minute guide', link: '/blog/how-to-check-rera-registration' },
    { text: 'Not sure of your budget? Get a free home-loan estimate', link: '/' },
    { text: 'Want us to call you back? Talk to an expert today', link: '/contact' },
  ],
}

/** Local mode: every setting lives in browser storage. */
function useLocalSettings() {
  return {
    whatsapp: usePersistedState('re-whatsapp-config', DEFAULT_WHATSAPP_CONFIG, { merge: true }),
    mail: usePersistedState('re-mail-config', DEFAULT_MAIL_CONFIG, { merge: true }),
    marketing: usePersistedState('re-marketing-config', DEFAULT_MARKETING_CONFIG, { merge: true }),
    cities: usePersistedState('re-cities', DEFAULT_CITIES),
    propertyTypes: usePersistedState('re-property-types', DEFAULT_PROPERTY_TYPES),
    topBanner: usePersistedState('re-top-banner', DEFAULT_TOP_BANNER, { merge: true }),
    ticker: usePersistedState('re-ticker', DEFAULT_TICKER, { merge: true }),
    company: usePersistedState('re-company', COMPANY_DEFAULTS, { merge: true }),
    siteContent: usePersistedState('re-site-content', SITE_DEFAULTS, { merge: true }),
  }
}

const fromServer = (d = {}, prev) => ({
  whatsapp: d.whatsapp ? { ...DEFAULT_WHATSAPP_CONFIG, ...d.whatsapp } : prev.whatsapp,
  mail: d.mail ? { ...DEFAULT_MAIL_CONFIG, ...d.mail } : prev.mail,
  marketing: d.marketing ? deepMerge(DEFAULT_MARKETING_CONFIG, d.marketing) : prev.marketing,
  cities: d.cities ?? prev.cities,
  propertyTypes: d.propertyTypes ?? prev.propertyTypes,
  topBanner: d.topBanner ? deepMerge(DEFAULT_TOP_BANNER, d.topBanner) : prev.topBanner,
  ticker: d.ticker ? deepMerge(DEFAULT_TICKER, d.ticker) : prev.ticker,
  company: d.company ? deepMerge(COMPANY_DEFAULTS, d.company) : prev.company,
  siteContent: d.siteContent ? deepMerge(SITE_DEFAULTS, d.siteContent) : prev.siteContent,
})

/**
 * API mode: settings come from the server (first the snapshot the site was built with — so the first render
 * matches the pre-rendered HTML — then the live values). Only an admin's edits are saved back
 * (PUT /admin/settings/:key, one second after the last keystroke). Same `[value, setValue]` shape as local mode.
 */
function useApiSettings() {
  const { user, ready: authReady } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [state, setState] = useState(() => fromServer(snapshot.settings ?? {}, {
    whatsapp: DEFAULT_WHATSAPP_CONFIG,
    mail: DEFAULT_MAIL_CONFIG,
    marketing: DEFAULT_MARKETING_CONFIG,
    cities: DEFAULT_CITIES,
    propertyTypes: DEFAULT_PROPERTY_TYPES,
    topBanner: DEFAULT_TOP_BANNER,
    ticker: DEFAULT_TICKER,
    company: COMPANY_DEFAULTS,
    siteContent: SITE_DEFAULTS,
  }))
  const latest = useRef(state)
  const timers = useRef({})
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    try {
      const d = await api(isAdmin ? '/admin/settings' : '/public/settings')
      setState((prev) => {
        latest.current = fromServer(d ?? {}, prev)
        return latest.current
      })
    } catch {
      /* API down: keep the built-in snapshot */
    }
    setLoaded(true)
  }, [isAdmin])

  useEffect(() => {
    if (authReady) load()
  }, [authReady, load])
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), [])

  const save = useCallback((key) => {
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => {
      api(`/admin/settings/${key}`, { method: 'PUT', body: { value: latest.current[key] } })
        .then((d) => {
          // secrets are never sent back — keep the "saved" flags the server reports
          if (key === 'whatsapp' || key === 'mail') setState((prev) => ({ ...prev, [key]: { ...prev[key], ...d.value } }))
        })
        .catch((err) => { reportApiError(err); load() })
    }, 1000)
  }, [load])

  const pair = (key) => [
    state[key],
    (updater) => {
      const next = typeof updater === 'function' ? updater(latest.current[key]) : updater
      latest.current = { ...latest.current, [key]: next }
      setState(latest.current)
      if (isAdmin) save(key)
    },
    authReady,
  ]

  return { loaded, whatsapp: pair('whatsapp'), mail: pair('mail'), marketing: pair('marketing'), cities: pair('cities'), propertyTypes: pair('propertyTypes'), topBanner: pair('topBanner'), ticker: pair('ticker'), company: pair('company'), siteContent: pair('siteContent') }
}

const useSettingsStore = USE_API ? useApiSettings : useLocalSettings

export function SettingsProvider({ children }) {
  const store = useSettingsStore()
  const [whatsappConfig, setWhatsappConfig] = store.whatsapp
  const [mailConfig, setMailConfig] = store.mail
  const [marketingConfig, setMarketingConfig] = store.marketing
  const [cities, setCities] = store.cities
  const [propertyTypes, setPropertyTypes] = store.propertyTypes
  const [topBanner, setTopBanner] = store.topBanner
  const [ticker, setTicker] = store.ticker
  const [company, setCompany] = store.company
  const [siteContent, setSiteContent] = store.siteContent

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
        settingsLoaded: store.loaded ?? true,
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
