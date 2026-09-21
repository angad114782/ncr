// Pre-renders every public URL to static HTML after `vite build` + the SSR build.
//
// Why: the site is a React single-page app. Google can run JavaScript, but many crawlers, link-preview
// bots and — importantly — most AI answer engines (ChatGPT, Perplexity, Claude…) read only the raw
// HTML. This writes dist/<route>/index.html for each route with the real content, headings, internal
// links, <title>, meta tags and JSON-LD already in the file. In the browser React hydrates that HTML.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { getRedirects, getRoutes, root, SITE } from './site-data.mjs'

const dist = resolve(root, process.env.DIST_DIR ?? 'dist') // scripts/release.mjs builds into dist-next first
const template = readFileSync(resolve(dist, 'index.html'), 'utf8')
const { render } = await import(pathToFileURL(resolve(root, 'dist-ssr/entry-server.js')).href)

// React 19 hoists <title>, <meta> and <link> elements (what <Seo> renders) to the very start of the
// prerendered output. Peel that prefix off so it can live in <head>; the rest is the page body.
const HEAD_TAG = /^(?:<link[^>]*>|<meta[^>]*>|<title[^>]*>[\s\S]*?<\/title>)/

function splitHead(rendered) {
  let rest = rendered
  const tags = []
  for (let m = rest.match(HEAD_TAG); m; m = rest.match(HEAD_TAG)) {
    tags.push(m[0])
    rest = rest.slice(m[0].length)
  }
  // React also preloads every non-lazy <img> it renders. Keep only the first (the likely LCP image)
  // so a gallery of thumbnails doesn't compete with it for bandwidth.
  let preloads = 0
  const kept = tags.filter((t) => !/^<link[^>]*rel="preload"[^>]*as="image"/.test(t) || preloads++ === 0)
  // Marked so main.jsx can remove them before hydrating (<Seo> re-creates them once — no duplicates).
  const head = kept.map((t) => t.replace(/^<(link|meta|title)/, '<$1 data-prerender="1"')).join('\n    ')
  return { head, body: rest }
}

function page(url, rendered) {
  const { head, body } = splitHead(rendered)
  const html = template
    .replace(/<!--app-head-start-->[\s\S]*<!--app-head-end-->/, () => head)
    .replace('<div id="root"></div>', () => `<div id="root" data-route="${url}">${body}</div>`)
  return { html, head, body }
}

const routes = getRoutes()
routes.push({ path: '/404-not-found', kind: 'notfound' }) // written to 404.html

let failed = 0
let links = 0
const started = Date.now()

for (const route of routes) {
  try {
    const { html: rendered } = { html: (await render(route.path)).html }
    const { html, head, body } = page(route.path, rendered)
    const h1 = (body.match(/<h1[\s>]/g) || []).length
    links += (body.match(/<a [^>]*href="\//g) || []).length

    if (route.kind !== 'notfound') {
      const problems = []
      if (h1 !== 1) problems.push(`expected exactly one <h1>, found ${h1}`)
      if (!/<title[^>]*>[^<]+<\/title>/.test(head)) problems.push('missing <title>')
      if (!/rel="canonical"/.test(head)) problems.push('missing canonical link')
      if (!/name="description"/.test(head)) problems.push('missing meta description')
      if (problems.length) throw new Error(problems.join('; '))
    }

    const file =
      route.kind === 'notfound' ? resolve(dist, '404.html')
      : route.path === '/' ? resolve(dist, 'index.html')
      : resolve(dist, route.path.slice(1), 'index.html')
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, html)
  } catch (err) {
    failed++
    console.error(`✗ ${route.path}: ${err.message}`)
  }
}

// Old /property/<id> links: a tiny page that points search engines (canonical + instant refresh) and
// visitors at the readable URL. (Add a 301 in nginx for the best signal — see deploy/nginx.example.conf.)
const redirects = getRedirects()
for (const { from, to } of redirects) {
  const html = `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<title>Redirecting…</title>
<link rel="canonical" href="${SITE}${to}">
<meta http-equiv="refresh" content="0; url=${to}">
<script>location.replace(${JSON.stringify(to)} + location.search + location.hash)</script>
</head>
<body><a href="${to}">This property has moved — continue</a></body>
</html>
`
  const file = resolve(dist, from.slice(1), 'index.html')
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, html)
}

// The same redirects as an nginx `map` file, for real 301s (see deploy/nginx.example.conf).
writeFileSync(resolve(dist, 'property-redirects.map'), `${redirects.map((r) => `${r.from} ${r.to};`).join('\n')}\n`)

console.log(`Pre-rendered ${routes.length - failed}/${routes.length} pages (${links} crawlable internal links, ${redirects.length} old-URL redirects) in ${((Date.now() - started) / 1000).toFixed(1)}s`)
if (failed) process.exit(1)
