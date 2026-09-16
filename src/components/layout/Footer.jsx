import { Link } from 'react-router-dom'
import { Building2, Globe, MessageCircle, Share2 } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-24 px-4 pb-28 md:pb-8">
      <div className="glass-strong max-w-6xl mx-auto rounded-[28px] p-8 md:p-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 font-semibold text-lg mb-3">
            <span className="w-9 h-9 rounded-[12px] bg-[var(--color-accent)] flex items-center justify-center text-white">
              <Building2 size={18} />
            </span>
            NCR Estates
          </div>
          <p className="text-secondary text-sm leading-relaxed">
            Discover premium homes, rentals, and commercial spaces across India.
          </p>
          <div className="flex gap-3 mt-4">
            {[Globe, MessageCircle, Share2].map((Icon, i) => (
              <a key={i} href="#" className="glass w-9 h-9 rounded-full flex items-center justify-center spring hover:scale-105">
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        <FooterCol title="Explore" links={[
          { to: '/listings', label: 'All Listings' },
          { to: '/listings?purpose=Buy', label: 'Buy' },
          { to: '/listings?purpose=Rent', label: 'Rent' },
          { to: '/agents', label: 'Agents' },
        ]} />

        <FooterCol title="Company" links={[
          { to: '/about', label: 'About Us' },
          { to: '/contact', label: 'Contact' },
        ]} />

        <FooterCol title="Cities" links={[
          { to: '/listings?city=Mumbai', label: 'Mumbai' },
          { to: '/listings?city=Delhi', label: 'Delhi' },
          { to: '/listings?city=Bangalore', label: 'Bangalore' },
          { to: '/listings?city=Pune', label: 'Pune' },
        ]} />
      </div>
      <p className="text-center text-tertiary text-xs mt-6">
        &copy; {new Date().getFullYear()} NCR Estates. All rights reserved.
      </p>
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
