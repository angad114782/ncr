import { getMotionComponent } from './motionComponent'

export default function GlassCard({ children, className = '', strong = false, hover = true, as: Component = 'div', ...props }) {
  const MotionComponent = getMotionComponent(Component)
  return (
    <MotionComponent
      className={`${strong ? 'glass-strong' : 'glass'} rounded-[22px] ${className}`}
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      {...props}
    >
      {children}
    </MotionComponent>
  )
}
