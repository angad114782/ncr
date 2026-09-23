import { Loader2 } from 'lucide-react'
import { getMotionComponent } from './motionComponent'

const variants = {
  primary:
    'bg-[var(--color-accent)] text-white border-transparent shadow-[0_8px_24px_color-mix(in_srgb,var(--color-accent)_35%,transparent)] hover:brightness-110',
  glass: 'glass text-[var(--text-primary)]',
  ghost: 'bg-transparent border-transparent text-[var(--text-primary)] hover:bg-[var(--glass-surface-weak)]',
  danger:
    'bg-[var(--color-danger)] text-white border-transparent shadow-[0_8px_24px_color-mix(in_srgb,var(--color-danger)_35%,transparent)] hover:brightness-110',
}

/**
 * `loading` is the one prop every submit/action button in the app should pass while its request is
 * in flight (`loading={busy}`): it disables the button, swaps the icon for a spinner, and swaps the
 * label for `loadingText` (falling back to the normal children if none is given) — one consistent
 * "this is doing something" state instead of each screen inventing its own (or, worse, a button that
 * just silently disables with no feedback at all).
 */
export default function GlassButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon,
  type = 'button',
  as: Component = 'button',
  loading = false,
  loadingText,
  disabled = false,
  ...props
}) {
  const sizes = {
    sm: 'px-4 py-2 text-sm gap-1.5',
    md: 'px-6 py-3 text-[15px] gap-2',
    lg: 'px-8 py-4 text-base gap-2.5',
  }

  const MotionComponent = getMotionComponent(Component)
  const typeProp = Component === 'button' ? { type } : {}
  const isDisabled = disabled || loading
  const disabledProp = Component === 'button' ? { disabled: isDisabled } : {}

  return (
    <MotionComponent
      whileTap={isDisabled ? undefined : { scale: 0.96 }}
      whileHover={isDisabled ? undefined : { scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center rounded-full font-medium border transition-[filter,background,color] duration-200 disabled:opacity-70 disabled:cursor-not-allowed ${loading ? 'cursor-wait' : ''} ${variants[variant]} ${sizes[size]} ${className}`}
      {...typeProp}
      {...disabledProp}
      {...props}
    >
      {loading ? <Loader2 size={18} strokeWidth={2} className="animate-spin" /> : Icon && <Icon size={18} strokeWidth={2} />}
      {loading && loadingText ? loadingText : children}
    </MotionComponent>
  )
}
