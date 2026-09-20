import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.jsx'

const container = document.getElementById('root')
const app = (
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
)

const path = window.location.pathname.replace(/\/+$/, '') || '/'

// Pages are pre-rendered at build time (scripts/prerender.mjs) so crawlers get real HTML.
// The pre-render also wrote that page's <head> tags; drop them so <Seo> (react-helmet-async)
// re-creates them once — otherwise every tag would appear twice.
document.head.querySelectorAll('[data-prerender]').forEach((el) => el.remove())

// Hydrate the HTML in place when it is for exactly this URL. Anything else (admin, dashboard,
// unknown URLs served by the SPA fallback, ?query variants) is rendered fresh.
if (container.hasChildNodes() && container.dataset.route === path && !window.location.search) {
  hydrateRoot(container, app)
} else {
  container.replaceChildren()
  createRoot(container).render(app)
}
