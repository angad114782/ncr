// Generates the crawler-facing files in /public before the build:
//   sitemap.xml    every indexable URL
//   llms.txt       short, curated map of the site for AI assistants (llmstxt.org)
//   llms-full.txt  the site's substance as plain text — about, FAQs, guides, listings — so answer
//                  engines (ChatGPT, Perplexity, Google AI Overviews, Claude…) can quote it accurately
//   feed.xml       RSS feed of the blog
// Run with: npm run seo   (also runs automatically before `npm run build`)
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SITE, getRoutes, listingsPath, loadData, root, xmlEscape } from './site-data.mjs'
import { formatPriceShort } from '../src/utils/format.js'
import { propertyPath } from '../src/utils/propertySlug.js'

const data = loadData()
const { properties, agents, posts, faqs, cities, company, content } = data
const routes = getRoutes(data)
const write = (name, text) => writeFileSync(resolve(root, 'public', name), text)
const abs = (p) => `${SITE}${p}`
const fill = (t) =>
  String(t ?? '')
    .replace(/\{brand\}/g, company.name)
    .replace(/\{ceoName\}/g, company.ceo.name)
    .replace(/\{ceoTitle\}/g, company.ceo.title)
    .replace(/\{years\}/g, String(company.ceo.experienceYears))

/* ------------------------------------------------------------- sitemap.xml */
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (r) => `  <url>
    <loc>${xmlEscape(abs(r.path))}</loc>
    <lastmod>${r.lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`,
)

/* --------------------------------------------------------------- llms.txt */
const citySummary = cities
  .map((city) => ({ city, n: properties.filter((p) => p.city === city).length }))
  .filter((c) => c.n > 0)

write(
  'llms.txt',
  `# ${company.name}

> ${company.tagline}. ${company.name} is an Indian real-estate platform led by ${company.ceo.name} (${company.ceo.title}, ${company.ceo.experienceYears}+ years in real estate). It lists verified homes to buy or rent in ${cities.join(', ')}, with free buyer guidance on RERA, home loans, stamp duty and documents.

## Key pages
- [Home](${abs('/')}): search homes to buy or rent
- [About ${company.name}](${abs('/about')}): who we are and how listings are verified
- [Our team](${abs('/team')}): ${company.ceo.name} and approved property consultants
- [Contact](${abs('/contact')}): call, WhatsApp, email or send an enquiry
- [Property blog](${abs('/blog')}): buying guides written by ${company.ceo.name}
- [Site map](${abs('/sitemap')}): every city, property type and guide
- [Privacy Policy](${abs('/privacy')}) · [Terms & Conditions](${abs('/terms')}) · [Disclaimer](${abs('/disclaimer')}): legal information

## Property search
${citySummary.map((c) => `- [Flats for sale in ${c.city}](${abs(listingsPath({ purpose: 'Buy', city: c.city }))}) · [Rent in ${c.city}](${abs(listingsPath({ purpose: 'Rent', city: c.city }))})`).join('\n')}

## Buying guides
${posts.map((p) => `- [${p.title}](${abs(`/blog/${p.slug}`)}): ${p.description}`).join('\n')}

## Optional
- [Full plain-text version of this site](${abs('/llms-full.txt')})
- [Blog RSS feed](${abs('/feed.xml')})
`,
)

/* ---------------------------------------------------------- llms-full.txt */
const about = content.about
write(
  'llms-full.txt',
  `# ${company.name} — full site text

${company.tagline}. Site: ${SITE}. Last generated: ${new Date().toISOString().slice(0, 10)}.

## About
${fill(about.heroText)}

${about.storyParagraphs.map(fill).join('\n\n')}

Mission: ${fill(about.missionText)}

### Leadership
${company.ceo.name}, ${company.ceo.title} — ${company.ceo.experienceYears}+ years of experience in real estate. ${company.ceo.summary}
Areas of expertise: ${company.ceo.expertise.join('; ')}.

### What we do
${about.services.map((s) => `- ${s.title}: ${fill(s.desc)}`).join('\n')}

### How listings are kept trustworthy
${about.trust.map((s) => `- ${s.title}: ${fill(s.desc)}`).join('\n')}

### Compliance
${about.compliance.map((c) => `- ${fill(c)}`).join('\n')}

## Cities and inventory (${properties.length} live listings)
${citySummary.map((c) => `- ${c.city}: ${c.n} listing${c.n > 1 ? 's' : ''} — ${abs(listingsPath({ purpose: 'Buy', city: c.city }))}`).join('\n')}

## Property consultants
${agents.map((a) => `- ${a.name}, ${a.role}, ${a.city} — ${abs(`/agents/${a.id}`)}`).join('\n')}

## Frequently asked questions
${faqs.map((f) => `### ${f.question}\n${f.answer}`).join('\n\n')}

## Buying guides
${posts
  .map(
    (p) => `### ${p.title}
URL: ${abs(`/blog/${p.slug}`)}
Author: ${p.author || company.ceo.name} · Published ${p.date} · Updated ${p.updated || p.date}
${p.summary ? `Quick answer: ${p.summary}\n` : ''}${p.description}

${p.intro ?? ''}

${p.body ?? ''}

${(p.faqs ?? []).map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}`,
  )
  .join('\n\n---\n\n')}

## Sample listings
${properties
  .slice(0, 30)
  .map((p) => `- ${p.title} — ${p.beds ? `${p.beds} BHK ` : ''}${p.type} for ${p.purpose === 'Rent' ? 'rent' : 'sale'} in ${p.locality}, ${p.city}, ${formatPriceShort(p.price)}${p.purpose === 'Rent' ? '/month' : ''}, ${p.areaSqft} sq.ft — ${abs(propertyPath(p))}`)
  .join('\n')}
`,
)

/* ---------------------------------------------------------------- feed.xml */
const rfc822 = (d) => new Date(d).toUTCString()
write(
  'feed.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(company.name)} — Property Blog</title>
    <link>${abs('/blog')}</link>
    <atom:link href="${abs('/feed.xml')}" rel="self" type="application/rss+xml" />
    <description>${xmlEscape(`Buying guides on RERA, home loans, stamp duty and documents from ${company.name}.`)}</description>
    <language>en-IN</language>
${posts
  .map(
    (p) => `    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${abs(`/blog/${p.slug}`)}</link>
      <guid isPermaLink="true">${abs(`/blog/${p.slug}`)}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <category>${xmlEscape(p.category ?? 'General')}</category>
      <description>${xmlEscape(p.description)}</description>
    </item>`,
  )
  .join('\n')}
  </channel>
</rss>
`,
)

console.log(`SEO files written: sitemap.xml (${routes.length} URLs), llms.txt, llms-full.txt, feed.xml (${posts.length} posts)`)
