import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useSettings } from '../../context/SettingsContext'
import { loadGoogleAds, loadMetaPixel, trackPageView } from '../../utils/tracking'

export default function TrackingScripts() {
  const { marketingConfig } = useSettings()
  const location = useLocation()

  useEffect(() => {
    loadMetaPixel(marketingConfig.metaPixelId)
  }, [marketingConfig.metaPixelId])

  useEffect(() => {
    loadGoogleAds(marketingConfig.googleAdsId)
  }, [marketingConfig.googleAdsId])

  useEffect(() => {
    if (marketingConfig.metaPixelId || marketingConfig.googleAdsId) {
      trackPageView()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  return null
}
