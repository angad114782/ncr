export default function GlassInput({ label, icon: Icon, className = '', as = 'input', children, onIconClick, hint, ...props }) {
  const Field = as
  const multiline = as === 'textarea'

  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      {label && <span className="text-sm font-medium text-secondary px-1">{label}</span>}
      {/* Textareas must grow — a fixed h-12 shell clipped them to a single line. */}
      <div
        className={`glass-weak rounded-[16px] flex gap-2 px-4 focus-within:ring-2 focus-within:ring-[var(--color-accent)]/50 transition-shadow ${
          multiline ? 'items-start' : 'items-center h-12'
        }`}
      >
        {Icon && (
          onIconClick ? (
            <button
              type="button"
              onClick={onIconClick}
              className={`text-tertiary shrink-0 hover:text-secondary spring ${multiline ? 'mt-3' : ''}`}
              tabIndex={-1}
            >
              <Icon size={18} />
            </button>
          ) : (
            <Icon size={18} className={`text-tertiary shrink-0 ${multiline ? 'mt-3.5' : ''}`} />
          )
        )}
        {/* text-[16px], not text-sm/[15px]: below 16px, iOS Safari auto-zooms the page on focus
            and the zoom doesn't reliably reset once the keyboard closes — the classic mobile-only
            "form looks broken / zoomed in" glitch. 16px is the threshold that keeps it from firing. */}
        {as === 'select' || multiline ? (
          <Field
            className={`bg-transparent outline-none w-full text-[16px] placeholder:text-tertiary py-3 ${
              multiline ? 'min-h-[5.5rem] resize-y' : 'h-full'
            }`}
            {...props}
          >
            {children}
          </Field>
        ) : (
          <Field
            className="bg-transparent outline-none w-full h-full text-[16px] placeholder:text-tertiary"
            {...props}
          />
        )}
      </div>
      {hint && <span className="text-tertiary text-xs px-1">{hint}</span>}
    </label>
  )
}
