// Loads the real Meta (Facebook) Pixel base script and initializes it.
// Standard snippet, adapted to run from JS instead of an inline <script> tag
// (scripts injected via innerHTML never execute, so this builds the DOM
// nodes and calls fbq() imperatively instead).
export function loadMetaPixel(pixelId) {
  if (!pixelId || typeof window === 'undefined') return
  if (window.fbq && window.__metaPixelId === pixelId) return // already loaded for this id

  if (!window.fbq) {
    const n = (window.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    })
    window._fbq = n
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    const t = document.createElement('script')
    t.async = true
    t.src = 'https://connect.facebook.net/en_US/fbevents.js'
    const s = document.getElementsByTagName('script')[0]
    s.parentNode.insertBefore(t, s)
  }

  // PageView is fired by TrackingScripts on mount and on every route change —
  // firing it here as well double-counted the first page load.
  window.fbq('init', pixelId)
  window.__metaPixelId = pixelId
}

// Loads Google's gtag.js and configures it for a Google Ads conversion id
// (AW-XXXXXXXXX). Same script needed for GA4 if that's ever added later.
export function loadGoogleAds(conversionId) {
  if (!conversionId || typeof window === 'undefined') return
  if (window.__googleAdsId === conversionId) return

  window.dataLayer = window.dataLayer || []
  if (!window.gtag) {
    window.gtag = function () {
      window.dataLayer.push(arguments)
    }
  }

  if (!document.querySelector(`script[data-gtag-src="${conversionId}"]`)) {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${conversionId}`
    script.dataset.gtagSrc = conversionId
    document.head.appendChild(script)
  }

  window.gtag('js', new Date())
  // send_page_view:false — trackPageView() sends page_view itself; the automatic
  // one from config would duplicate the first page load.
  window.gtag('config', conversionId, { send_page_view: false })
  window.__googleAdsId = conversionId
}

export function trackPageView() {
  if (window.fbq) window.fbq('track', 'PageView')
  if (window.gtag && window.__googleAdsId) {
    window.gtag('event', 'page_view', { send_to: window.__googleAdsId })
  }
}

/**
 * Fires a lead/conversion event on both platforms after a meaningful form
 * submission (inquiry, contact, signup). Safe to call even when neither
 * platform is configured — it's just a no-op then.
 */
export function fireLeadEvent(marketingConfig, formName, extra = {}) {
  if (typeof window === 'undefined') return

  // `extra` carries non-identifying context (city, property type, intent level) so the ad platforms
  // can build better audiences. Never pass a name, phone number or e-mail here.
  if (window.fbq && marketingConfig?.metaPixelId) {
    window.fbq('track', 'Lead', { content_name: formName, ...extra })
  }

  if (window.gtag && marketingConfig?.googleAdsId) {
    const sendTo = marketingConfig.googleAdsConversionLabel
      ? `${marketingConfig.googleAdsId}/${marketingConfig.googleAdsConversionLabel}`
      : marketingConfig.googleAdsId
    window.gtag('event', 'conversion', { send_to: sendTo, event_category: formName, ...extra })
  }
}
