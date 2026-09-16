import { createContext, useContext, useEffect, useState } from 'react'
import { fireLeadEvent as fireLeadEventUtil } from '../utils/tracking'

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

function usePersistedState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? { ...initial, ...JSON.parse(saved) } : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* ignore */
    }
  }, [key, value])
  return [value, setValue]
}

export function SettingsProvider({ children }) {
  const [whatsappConfig, setWhatsappConfig] = usePersistedState('re-whatsapp-config', DEFAULT_WHATSAPP_CONFIG)
  const [mailConfig, setMailConfig] = usePersistedState('re-mail-config', DEFAULT_MAIL_CONFIG)
  const [marketingConfig, setMarketingConfig] = usePersistedState('re-marketing-config', DEFAULT_MARKETING_CONFIG)

  const updateWhatsappConfig = (patch) => setWhatsappConfig((prev) => ({ ...prev, ...patch }))
  const updateMailConfig = (patch) => setMailConfig((prev) => ({ ...prev, ...patch }))
  const updateMarketingConfig = (patch) => setMarketingConfig((prev) => ({ ...prev, ...patch }))

  const fireLeadEvent = (formName) => fireLeadEventUtil(marketingConfig, formName)

  return (
    <SettingsContext.Provider
      value={{
        whatsappConfig,
        mailConfig,
        marketingConfig,
        updateWhatsappConfig,
        updateMailConfig,
        updateMarketingConfig,
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
