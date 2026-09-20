import { Helmet } from 'react-helmet-async'
import { SITE_URL } from '../../utils/seo'

export { SITE_URL }
export const SITE_NAME = 'NCR Estates'
const DEFAULT_DESCRIPTION =
  'Find verified apartments, villas, studios and commercial properties to buy or rent across Mumbai, Delhi, Bangalore, Pune, Hyderabad, Chennai and Gurugram.'
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200'

// Every page renders one of these — the static index.html deliberately has no
// canonical / og:url of its own, otherwise every route would canonicalise to "/".
export default function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image = DEFAULT_IMAGE,
  jsonLd,
  noindex = false,
  type = 'website',
  publishedTime,
  modifiedTime,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Real Estate Across India`
  const canonical = `${SITE_URL}${path}`
  const ldItems = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'} />

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_IN" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {ldItems.map((item, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(item)}</script>
      ))}
    </Helmet>
  )
}
