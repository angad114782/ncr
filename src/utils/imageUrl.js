// Right-sized image URLs. The seed photos are 1200px-wide Unsplash images; a listing card only needs
// ~600px, so requesting the full file for every card wastes most of the page weight. Unsplash
// resizes on the fly (w, q, auto=format → WebP/AVIF), so we ask for exactly the widths we need.
// Any other host (uploaded data: images, own CDN, pravatar) is passed through untouched.

const UNSPLASH = /^https:\/\/images\.unsplash\.com\//

export const isResizable = (src) => typeof src === 'string' && UNSPLASH.test(src)

export function resizedSrc(src, width, quality = 70) {
  if (!isResizable(src)) return src
  const url = new URL(src)
  url.searchParams.set('w', String(width))
  url.searchParams.set('q', String(quality))
  url.searchParams.set('auto', 'format')
  url.searchParams.set('fit', 'crop')
  return url.toString()
}

/** srcset string for a resizable image, or undefined. */
export function buildSrcSet(src, widths = [480, 800, 1200]) {
  if (!isResizable(src)) return undefined
  return widths.map((w) => `${resizedSrc(src, w)} ${w}w`).join(', ')
}
