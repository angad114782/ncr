import { useSettings } from '../../context/SettingsContext'

// Shows the CEO's real photo when one is set (upload or link in Admin → Site Content),
// otherwise clean initials — never a stock photo standing in for a real person.
export default function CeoAvatar({ className = 'w-24 h-24 text-3xl' }) {
  const { company } = useSettings()
  const { name, photo } = company.ceo
  if (photo) {
    return <img src={photo} alt={name} className={`${className} rounded-full object-cover`} />
  }
  const initials = name.split(' ').map((w) => w[0]).join('')
  return (
    <span
      role="img"
      aria-label={name}
      className={`${className} rounded-full glass-strong flex items-center justify-center font-bold text-[var(--color-accent)] shrink-0`}
    >
      {initials}
    </span>
  )
}
