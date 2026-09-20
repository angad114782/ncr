import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2, Home, MessageCircle } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import Seo from '../../components/layout/Seo'
import { useSettings } from '../../context/SettingsContext'

export default function ThankYou() {
  const location = useLocation()
  const { whatsappConfig } = useSettings()
  const leadName = location.state?.leadName

  // The conversion event fires once, at form submit (LeadForm / Contact).
  // Firing it here too counted every lead twice in Meta and Google Ads; this
  // URL still gets a normal page-view, which is enough for URL-based goals.
  return (
    <div className="flex items-center justify-center py-16">
      <Seo title="Thank You" description="Your enquiry has been received." path="/thank-you" noindex />
      <GlassCard hover={false} strong className="p-10 md:p-14 text-center max-w-lg">
        <span className="w-16 h-16 rounded-full bg-[var(--color-success)] flex items-center justify-center text-white mx-auto mb-5">
          <CheckCircle2 size={30} />
        </span>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Thank You{leadName ? `, ${leadName.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-secondary mb-8">
          Your request has been received. Our team will reach out to you shortly — we aim to respond within 24 hours.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={`https://wa.me/91${whatsappConfig.displayPhone}?text=${encodeURIComponent("Hi! I just submitted an inquiry on NCR Estates.")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <GlassButton variant="glass" className="w-full justify-center" style={{ color: '#25D366' }}>
              <MessageCircle size={16} /> Chat on WhatsApp
            </GlassButton>
          </a>
          <Link to="/">
            <GlassButton className="w-full justify-center">
              <Home size={16} /> Back to Home
            </GlassButton>
          </Link>
        </div>
      </GlassCard>
    </div>
  )
}
