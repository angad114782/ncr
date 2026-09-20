import { Link } from 'react-router-dom'
import { Award, BadgeCheck, Briefcase, MapPin, Quote, Star } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import CeoAvatar from '../../components/company/CeoAvatar'
import AgentRegisterCta from '../../components/common/AgentRegisterCta'
import Seo from '../../components/layout/Seo'
import { useData } from '../../context/DataContext'
import { useSettings } from '../../context/SettingsContext'
import { SITE_URL, breadcrumbLd, organizationLd, personLd } from '../../utils/seo'

export default function Team() {
  const { approvedAgents } = useData()
  const { company, siteContent, fill, whatsappConfig, mailConfig, cities } = useSettings()
  const { ceo } = company
  const c = siteContent.team

  return (
    <div className="pb-16">
      <Seo
        title={`Our Team — ${ceo.name}, ${ceo.title} & Property Experts`}
        description={`Meet the people behind ${company.name}: ${ceo.name} (${ceo.title}, ${ceo.experienceYears}+ years of real estate experience) and our team of property consultants across India.`}
        path="/team"
        jsonLd={[
          breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Our Team', path: '/team' }]),
          { '@context': 'https://schema.org', '@type': 'ProfilePage', url: `${SITE_URL}/team`, mainEntity: personLd(company) },
          { '@context': 'https://schema.org', ...organizationLd({ company, phone: whatsappConfig.displayPhone, email: mailConfig.fromEmail, cities }) },
        ]}
      />

      <div className="text-center mb-10 max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-bold mb-3">{fill(c.title)}</h1>
        <p className="text-secondary text-base md:text-lg">{fill(c.subtitle)}</p>
      </div>

      {/* CEO */}
      <GlassCard hover={false} strong className="p-6 md:p-10 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-start">
          <div className="flex flex-col items-center text-center md:w-56">
            <CeoAvatar className="w-36 h-36 text-5xl mb-4" />
            <h2 className="text-2xl font-bold">{ceo.name}</h2>
            <p className="text-[var(--color-accent)] font-semibold">{ceo.title}, {company.name}</p>
            <div className="glass-weak rounded-full px-4 py-1.5 text-sm mt-3 flex items-center gap-1.5">
              <Award size={14} className="text-[var(--color-accent)]" /> {ceo.experienceYears}+ years in real estate
            </div>
          </div>

          <div className="min-w-0">
            <h3 className="text-xl font-semibold mb-3">About {ceo.name.split(' ')[0]}</h3>
            <p className="text-secondary leading-relaxed mb-5">{ceo.summary}</p>

            {ceo.expertise.length > 0 && (
              <>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Briefcase size={16} className="text-[var(--color-accent)]" /> Areas of expertise
                </h3>
                <div className="flex flex-wrap gap-2 mb-6">
                  {ceo.expertise.map((e) => (
                    <span key={e} className="glass-weak rounded-full px-3.5 py-1.5 text-sm">{e}</span>
                  ))}
                </div>
              </>
            )}

            {ceo.quote && (
              <blockquote className="glass-weak rounded-[18px] p-5 flex gap-3">
                <Quote size={20} className="text-[var(--color-accent)] shrink-0 mt-0.5" />
                <p className="text-secondary italic leading-relaxed">“{ceo.quote}”</p>
              </blockquote>
            )}

            <div className="flex flex-wrap gap-3 mt-6">
              <Link to="/contact"><GlassButton>Talk to {ceo.name.split(' ')[0]}’s team</GlassButton></Link>
              <Link to="/blog"><GlassButton variant="glass">Read our guides</GlassButton></Link>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Agents */}
      {approvedAgents.length > 0 && (
        <section className="mb-12" aria-labelledby="agents-heading">
          <div className="mb-6">
            <h2 id="agents-heading" className="text-2xl md:text-3xl font-bold">{fill(c.consultantsTitle)}</h2>
            <p className="text-secondary mt-1">{fill(c.consultantsSubtitle)}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {approvedAgents.map((agent) => (
              <Link key={agent.id} to={`/agents/${agent.id}`}>
                <GlassCard className="p-6 text-center h-full">
                  {agent.avatar ? (
                    <img src={agent.avatar} alt={`${agent.name}, ${agent.role}`} loading="lazy" className="w-20 h-20 rounded-full object-cover mx-auto mb-3 ring-2 ring-[var(--glass-border)]" />
                  ) : (
                    <span className="w-20 h-20 rounded-full glass-strong flex items-center justify-center mx-auto mb-3 text-2xl font-bold text-[var(--color-accent)]">{agent.name[0]}</span>
                  )}
                  <h3 className="font-semibold">{agent.name}</h3>
                  <p className="text-secondary text-sm mb-3">{agent.role}</p>
                  <div className="flex items-center justify-center gap-3 text-xs text-secondary">
                    <span className="flex items-center gap-1"><MapPin size={12} /> {agent.city}</span>
                    {agent.rating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star size={12} className="fill-[var(--color-warning)] text-[var(--color-warning)]" /> {agent.rating}
                      </span>
                    )}
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Standards */}
      {c.standards.length > 0 && (
        <section className="mb-12" aria-labelledby="standards-heading">
          <h2 id="standards-heading" className="text-2xl md:text-3xl font-bold mb-6 text-center">{fill(c.standardsTitle)}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {c.standards.map((v, i) => (
              <GlassCard key={i} className="p-6">
                <BadgeCheck className="text-[var(--color-accent)] mb-3" size={26} />
                <h3 className="font-semibold text-lg mb-2">{v.title}</h3>
                <p className="text-secondary text-sm leading-relaxed">{fill(v.desc)}</p>
              </GlassCard>
            ))}
          </div>
        </section>
      )}

      <GlassCard hover={false} className="p-8 md:p-10 text-center">
        <h2 className="text-xl md:text-2xl font-bold mb-2">{fill(c.joinTitle)}</h2>
        <p className="text-secondary max-w-xl mx-auto mb-5">{fill(c.joinText)}</p>
        <Link to="/contact?intent=partner"><GlassButton>Get in touch</GlassButton></Link>
      </GlassCard>

      <AgentRegisterCta className="mt-8" />
    </div>
  )
}
