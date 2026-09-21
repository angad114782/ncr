import { buildSrcSet, resizedSrc } from '../../utils/imageUrl'

/**
 * <img> with performance defaults: responsive srcset (for resizable hosts), lazy loading + async
 * decoding, and `priority` for the one above-the-fold LCP image (eager + fetchpriority=high).
 * Give it `width` / `height` (the intrinsic ratio) so the browser reserves space and the page
 * doesn't jump while loading. Until the picture has arrived the box shows a grey shimmer (.img-skeleton);
 * `data-loaded` is set by the browser events (or right away for an image that finished before hydration).
 */
const markLoaded = (el) => {
  if (el) el.dataset.loaded = '1'
}
const markIfDone = (el) => {
  if (el?.complete) markLoaded(el)
}

export default function Img({ src, alt = '', sizes = '100vw', widths, priority = false, className = '', ...rest }) {
  const w = widths ?? [480, 800, 1200]
  return (
    <img
      src={resizedSrc(src, w[Math.min(1, w.length - 1)])}
      srcSet={buildSrcSet(src, w)}
      sizes={buildSrcSet(src, w) ? sizes : undefined}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : undefined}
      className={`img-skeleton ${className}`}
      ref={markIfDone}
      onLoad={(e) => markLoaded(e.currentTarget)}
      onError={(e) => markLoaded(e.currentTarget)}
      {...rest}
    />
  )
}
