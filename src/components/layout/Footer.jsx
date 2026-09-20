import { Link } from 'react-router-dom'
import { Building2, Mail, MapPin, Phone } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext'
import { formatAddress, hasAddress } from '../../data/company'

const socialLabels = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', youtube: 'YouTube' }

export default function Footer() {
  const { cities, propertyTypes, whatsappConfig, mailConfig, company, siteContent, fill } = useSettings()
  const socials = Object.entries(company.social ?? {}).filter(([, url]) => url)

  return (
    <footer className="mt-24 px-4 pb-28 md:pb-8">
      <div className="glass-strong max-w-6xl mx-auto rounded-[28px] p-8 md:p-12 grid grid-cols-2 md:grid-cols-6 gap-8">
        <div className="col-span-2">
          <div className="flex items-center gap-2 font-semibold text-lg mb-3">
            <span className="w-9 h-9 rounded-[12px] bg-[var(--color-accent)] flex items-center justify-center text-white">
              <Building2 size={18} />
            </span>
            {company.name}
          </div>
          <p className="text-secondary text-sm leading-relaxed mb-4">{fill(siteContent.footer.blurb)}</p>
          <ul className="flex flex-col gap-2 text-sm text-secondary">
            <li className="flex items-center gap-2">
              <Phone size={14} className="text-[var(--color-accent)]" />
              <a href={`tel:+91${whatsappConfig.displayPhone}`} className="hover:text-[var(--color-accent)]">+91 {whatsappConfig.displayPhone}</a>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={14} className="text-[var(--color-accent)]" />
              <a href={`mailto:${mailConfig.fromEmail}`} className="hover:text-[var(--color-accent)]">{mailConfig.fromEmail}</a>
            </li>
            {hasAddress(company.address) && (
              <li className="flex items-start gap-2">
                <MapPin size={14} className="text-[var(--color-accent)] mt-0.5 shrink-0" /> {formatAddress(company.address)}
              </li>
            )}
          </ul>
          {socials.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {socials.map(([key, url]) => (
                <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="glass px-3 py-1.5 rounded-full text-xs font-medium spring hover:scale-105">
                  {socialLabels[key]}
                </a>
              ))}
            </div>
          )}
        </div>

        <FooterCol title="Buy Property" links={cities.map((c) => ({
          to: `/listings?purpose=Buy&city=${encodeURIComponent(c)}`,
          label: `Flats for Sale in ${c}`,
        }))} />

        <FooterCol title="Rent Property" links={cities.map((c) => ({
          to: `/listings?purpose=Rent&city=${encodeURIComponent(c)}`,
          label: `Rent in ${c}`,
        }))} />

        <FooterCol title="Property Types" links={[
          ...propertyTypes.map((t) => ({ to: `/listings?type=${encodeURIComponent(t)}`, label: t })),
          { to: '/listings?beds=2&purpose=Buy', label: '2 BHK Flats' },
          { to: '/listings?beds=3&purpose=Buy', label: '3 BHK Flats' },
          { to: `/listings?possession=${encodeURIComponent(siteContent.options.possession[0] ?? 'Ready to Move')}&purpose=Buy`, label: siteContent.options.possession[0] ?? 'Ready to Move' },
        ]} />

        <FooterCol title="Company" links={[
          { to: '/about', label: 'About Us' },
          { to: '/team', label: 'Our Team' },
          { to: '/blog', label: 'Blog' },
          { to: '/agents', label: 'Agents' },
          { to: '/compare', label: 'Compare Properties' },
          { to: '/contact', label: 'Contact Us' },
        ]} />
      </div>

      <div className="max-w-6xl mx-auto mt-6 text-center">
        <p className="text-tertiary text-xs leading-relaxed max-w-3xl mx-auto">
          {fill(siteContent.footer.disclaimer)} {company.reraAgentId ? `RERA agent registration no. ${company.reraAgentId}.` : ''}
        </p>
        <p className="text-tertiary text-xs mt-3">
          &copy; {new Date().getFullYear()} {company.name}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h4 className="font-semibold mb-3 text-sm">{title}</h4>
      <ul className="flex flex-col gap-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link to={l.to} className="text-secondary text-sm hover:text-[var(--color-accent)] transition-colors">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
