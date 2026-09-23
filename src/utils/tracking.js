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

// gtag.js is one shared script + dataLayer for every Google destination (Ads, GA4, ...) — it only
// needs loading once, then each destination is added with its own `gtag('config', id)` call. `id`
// here is just which one to fetch the script under; any configured id works.
function ensureGtagLoaded(id) {
  window.dataLayer = window.dataLayer || []
  if (!window.gtag) {
    window.gtag = function () {
      window.dataLayer.push(arguments)
    }
  }
  if (!document.querySelector('script[data-gtag-loaded]')) {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
    script.dataset.gtagLoaded = 'true'
    document.head.appendChild(script)
    window.gtag('js', new Date())
  }
}

// Configures gtag.js for a Google Ads conversion id (AW-XXXXXXXXX).
export function loadGoogleAds(conversionId) {
  if (!conversionId || typeof window === 'undefined') return
  if (window.__googleAdsId === conversionId) return
  ensureGtagLoaded(conversionId)
  // send_page_view:false — trackPageView() sends page_view itself; the automatic
  // one from config would duplicate the first page load.
  window.gtag('config', conversionId, { send_page_view: false })
  window.__googleAdsId = conversionId
}

// Configures gtag.js for a GA4 property (Measurement ID, G-XXXXXXXXX) — a separate Google product
// from Google Ads above; a site can have either, both, or neither configured independently.
export function loadGoogleAnalytics(measurementId) {
  if (!measurementId || typeof window === 'undefined') return
  if (window.__gaId === measurementId) return
  ensureGtagLoaded(measurementId)
  window.gtag('config', measurementId, { send_page_view: false })
  window.__gaId = measurementId
}

export function trackPageView() {
  if (window.fbq) window.fbq('track', 'PageView')
  const sendTo = [window.__googleAdsId, window.__gaId].filter(Boolean)
  if (window.gtag && sendTo.length) window.gtag('event', 'page_view', { send_to: sendTo })
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

  // GA4's own recommended event name for a lead, distinct from the Ads "conversion" above — a site
  // can have GA4 without ever running Google Ads.
  if (window.gtag && marketingConfig?.googleAnalyticsId) {
    window.gtag('event', 'generate_lead', { send_to: marketingConfig.googleAnalyticsId, event_category: formName, ...extra })
  }
}
