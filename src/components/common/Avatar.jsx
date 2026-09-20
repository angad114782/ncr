// Person photo, or a clean initial when none was added (an <img src=""> makes browsers re-download the page).
export default function Avatar({ src, name = '?', className = 'w-12 h-12', alt }) {
  if (src) return <img src={src} alt={alt ?? name} loading="lazy" className={`${className} object-cover`} />
  return (
    <span role="img" aria-label={alt ?? name} className={`${className} glass-strong flex items-center justify-center font-bold text-[var(--color-accent)] shrink-0`}>
      {(name || '?')[0]}
    </span>
  )
}
