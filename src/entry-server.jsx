import { prerender } from 'react-dom/static'
import { StaticRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AppRoutes, Providers } from './App.jsx'

/**
 * Build-time renderer (see scripts/prerender.mjs). Turns a URL into the full HTML the page
 * produces in the browser — content, headings, links, and the <head> tags / JSON-LD each page
 * sets through <Seo> — so search-engine and AI crawlers get everything without running JS.
 */
export async function render(url) {
  const helmetContext = {}
  const { prelude } = await prerender(
    <HelmetProvider context={helmetContext}>
      <Providers>
        <StaticRouter location={url}>
          <AppRoutes />
        </StaticRouter>
      </Providers>
    </HelmetProvider>,
  )
  const html = await new Response(prelude).text()
  const h = helmetContext.helmet
  const head = ['title', 'priority', 'meta', 'link', 'script', 'style']
    .map((k) => h?.[k]?.toString() ?? '')
    .join('\n    ')
  return { html, head }
}
