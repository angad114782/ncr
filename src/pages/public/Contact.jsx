import { useState } from 'react'
import { Check, Mail, MapPin, Phone } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassInput from '../../components/glass/GlassInput'
import GlassButton from '../../components/glass/GlassButton'
import { useSettings } from '../../context/SettingsContext'

export default function Contact() {
  const { whatsappConfig, mailConfig, fireLeadEvent } = useSettings()
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', message: '' })

  const handleSubmit = (e) => {
    e.preventDefault()
    fireLeadEvent('contact_form')
    setSent(true)
  }

  return (
    <div className="pb-16">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Get in Touch</h1>
        <p className="text-secondary">We'd love to help you find your next property.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mb-8">
        {[
          { icon: Phone, title: 'Call Us', value: `+91 ${whatsappConfig.displayPhone}` },
          { icon: Mail, title: 'Email Us', value: mailConfig.fromEmail },
          { icon: MapPin, title: 'Visit Us', value: 'Connaught Place, New Delhi' },
        ].map((c) => (
          <GlassCard key={c.title} className="p-6 text-center">
            <c.icon className="mx-auto mb-2 text-[var(--color-accent)]" size={24} />
            <h3 className="font-semibold">{c.title}</h3>
            <p className="text-secondary text-sm">{c.value}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard hover={false} strong className="p-6 md:p-10 max-w-2xl mx-auto">
        {sent ? (
          <div className="text-center py-10">
            <Check className="mx-auto mb-3 text-[var(--color-success)]" size={36} />
            <h3 className="text-xl font-semibold mb-1">Message Sent!</h3>
            <p className="text-secondary">Our team will reach out within 24 hours.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <GlassInput
              label="Full Name"
              placeholder="Your name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <GlassInput
              label="Email"
              type="email"
              placeholder="you@example.com"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <GlassInput
              label="Message"
              as="textarea"
              rows={4}
              placeholder="How can we help?"
              required
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
            <GlassButton type="submit" className="w-full justify-center">Send Message</GlassButton>
          </form>
        )}
      </GlassCard>
    </div>
  )
}
