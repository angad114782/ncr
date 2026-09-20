import { useMemo } from 'react'
import { useSettings } from '../context/SettingsContext'
import { buildAutoLinkRules } from '../utils/autoLink'

/** The site's current auto-link rules (admin keywords + city names). */
export function useAutoLinkRules() {
  const { siteContent, cities } = useSettings()
  return useMemo(() => buildAutoLinkRules({ seo: siteContent.seo, cities }), [siteContent.seo, cities])
}
