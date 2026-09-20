import { getMotionComponent } from './motionComponent'

const variants = {
  primary:
    'bg-[var(--color-accent)] text-white border-transparent shadow-[0_8px_24px_color-mix(in_srgb,var(--color-accent)_35%,transparent)] hover:brightness-110',
  glass: 'glass text-[var(--text-primary)]',
  ghost: 'bg-transparent border-transparent text-[var(--text-primary)] hover:bg-[var(--glass-surface-weak)]',
  danger:
    'bg-[var(--color-danger)] text-white border-transparent shadow-[0_8px_24px_color-mix(in_srgb,var(--color-danger)_35%,transparent)] hover:brightness-110',
}

export default function GlassButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon,
  type = 'button',
  as: Component = 'button',
  ...props
}) {
  const sizes = {
    sm: 'px-4 py-2 text-sm gap-1.5',
    md: 'px-6 py-3 text-[15px] gap-2',
    lg: 'px-8 py-4 text-base gap-2.5',
  }

  const MotionComponent = getMotionComponent(Component)
  const typeProp = Component === 'button' ? { type } : {}

  return (
    <MotionComponent
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`inline-flex items-center justify-center rounded-full font-medium border transition-[filter,background,color] duration-200 ${variants[variant]} ${sizes[size]} ${className}`}
      {...typeProp}
      {...props}
    >
      {Icon && <Icon size={18} strokeWidth={2} />}
      {children}
    </MotionComponent>
  )
}
