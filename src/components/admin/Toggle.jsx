// iOS-style on/off switch used across the admin (active / featured / enabled …).
export default function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-7 rounded-full spring shrink-0 disabled:opacity-40 ${
        checked ? 'bg-[var(--color-success)]' : 'bg-[var(--glass-surface-strong)]'
      }`}
    >
      <span className="absolute top-1 w-5 h-5 rounded-full bg-white shadow spring" style={{ left: checked ? '26px' : '4px' }} />
    </button>
  )
}
