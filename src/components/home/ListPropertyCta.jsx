import { Link, useOutletContext } from 'react-router-dom'
import { ArrowRight, Building2 } from 'lucide-react'
import GlassCard from '../glass/GlassCard'
import GlassButton from '../glass/GlassButton'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'

/**
 * "List My Property". With the agent program on (Admin → Site Content → Home → Banner), a visitor who is not
 * signed in lands directly on the agent registration form and, once registered, on their "My listings" page
 * where the property is posted (our team reviews it before it goes live). An agent goes straight to
 * "My listings". A signed-in buyer or the admin gets the same agent form (with a note that continuing signs them out).
 * Only when the option is switched off does the button follow `cta.link`. The href stays a real link, so it still
 * works without JavaScript and for crawlers.
 */
export default function ListPropertyCta() {
  const { siteContent, fill } = useSettings()
  const { user } = useAuth()
  const outlet = useOutletContext()
  const { title, text, buttonLabel, link, agentSignup } = siteContent.cta
  const agentsOn = agentSignup !== false && siteContent.agentProgram.enabled !== false

  const external = /^https?:\/\//.test(link)
  let linkProps = external
    ? { as: 'a', href: link, target: '_blank', rel: 'noopener noreferrer' }
    : { as: Link, to: link || '/contact' }

  if (agentsOn && user?.role === 'agent') {
    linkProps = { as: Link, to: '/agent/listings' }
  } else if (agentsOn && outlet?.openAuth) {
    linkProps = {
      as: Link,
      to: link || '/contact',
      onClick: (e) => {
        e.preventDefault()
        outlet.openAuth('signup', 'list', 'agent')
      },
    }
  }

  return (
    <section className="mb-16">
      <GlassCard strong hover={false} className="p-8 md:p-12 text-center overflow-hidden relative">
        <Building2 className="mx-auto mb-4 text-[var(--color-accent)]" size={32} />
        <h2 className="text-2xl md:text-3xl font-bold mb-2">{fill(title)}</h2>
        <p className="text-secondary max-w-lg mx-auto mb-6">{fill(text)}</p>
        <GlassButton size="md" {...linkProps} className="mx-auto">
          {buttonLabel} <ArrowRight size={18} />
        </GlassButton>
      </GlassCard>
    </section>
  )
}
