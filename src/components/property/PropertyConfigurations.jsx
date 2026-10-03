/**
 * A project sold in several sizes: one tab per BHK. The page shows the chosen size's own price and area.
 * Renders nothing for a single-size listing.
 */
export default function PropertyConfigurations({ configurations = [], index = 0, onChange, className = '' }) {
  if (configurations.length < 2) return null
  return (
    <div role="tablist" aria-label="Choose a BHK size" className={`flex flex-wrap gap-2 ${className}`}>
      {configurations.map((c, i) => {
        const on = i === index
        return (
          <button
            key={`${c.beds}-${i}`}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(i)}
            className={`px-5 py-2 rounded-full text-sm font-semibold spring ${on ? 'bg-[var(--color-accent)] text-white shadow-md' : 'glass-weak text-secondary hover:text-primary'}`}
          >
            {c.beds} BHK
          </button>
        )
      })}
    </div>
  )
}
