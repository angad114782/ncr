export default function GlassInput({ label, icon: Icon, className = '', as = 'input', children, onIconClick, ...props }) {
  const Field = as
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      {label && <span className="text-sm font-medium text-secondary px-1">{label}</span>}
      <div className="glass-weak rounded-[16px] flex items-center gap-2 px-4 h-12 focus-within:ring-2 focus-within:ring-[var(--color-accent)]/50 transition-shadow">
        {Icon && (
          onIconClick ? (
            <button
              type="button"
              onClick={onIconClick}
              className="text-tertiary shrink-0 hover:text-secondary spring"
              tabIndex={-1}
            >
              <Icon size={18} />
            </button>
          ) : (
            <Icon size={18} className="text-tertiary shrink-0" />
          )
        )}
        {as === 'select' || as === 'textarea' ? (
          <Field
            className="bg-transparent outline-none w-full h-full text-[15px] placeholder:text-tertiary py-3"
            {...props}
          >
            {children}
          </Field>
        ) : (
          <Field
            className="bg-transparent outline-none w-full h-full text-[15px] placeholder:text-tertiary"
            {...props}
          />
        )}
      </div>
    </label>
  )
}
