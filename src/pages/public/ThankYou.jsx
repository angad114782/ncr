import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2, Home, MessageCircle } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import { useSettings } from '../../context/SettingsContext'

export default function ThankYou() {
  const location = useLocation()
  const { fireLeadEvent, whatsappConfig } = useSettings()
  const leadName = location.state?.leadName

  // A dedicated "thank you" URL that's only ever reached after a successful
  // submission is the standard way Google Ads recommends setting up a
  // page-load conversion action — this fires it as a second, independent
  // signal alongside the one already fired on form submit.
  useEffect(() => {
    fireLeadEvent('thank_you_page_view')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex items-center justify-center py-16">
      <GlassCard hover={false} strong className="p-10 md:p-14 text-center max-w-lg">
        <span className="w-16 h-16 rounded-full bg-[var(--color-success)] flex items-center justify-center text-white mx-auto mb-5">
          <CheckCircle2 size={30} />
        </span>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Thank You{leadName ? `, ${leadName.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-secondary mb-8">
          Your request has been received and verified. Our team will reach out to you shortly — usually within a
          few hours.
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
