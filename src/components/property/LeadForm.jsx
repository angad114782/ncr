import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, IndianRupee, Lock, Mail, Phone, ShieldCheck, User } from 'lucide-react'
import GlassInput from '../glass/GlassInput'
import GlassButton from '../glass/GlassButton'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'

const OTP_LENGTH = 4

function generateOtp() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export default function LeadForm({ property }) {
  const { addInquiry } = useData()
  const { user } = useAuth()
  const { fireLeadEvent, siteContent } = useSettings()
  const navigate = useNavigate()

  const { buyBudgets, rentBudgets } = siteContent.forms // editable in Admin → Site Content → Forms & options
  const budgetOptions = (property?.purpose === 'Rent' ? rentBudgets : buyBudgets).filter(Boolean)

  const [step, setStep] = useState('details')
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    budget: budgetOptions[0] ?? '',
    message: '',
  })
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''))
  const [sentOtp, setSentOtp] = useState('')
  const [error, setError] = useState('')
  const inputRefs = useRef([])

  const handleSendOtp = (e) => {
    e.preventDefault()
    setError('')
    if (form.name.trim().length < 2) {
      setError('Please enter your name')
      return
    }
    if (!/^\d{10}$/.test(form.phone)) {
      setError('Enter a valid 10-digit mobile number')
      return
    }
    const otp = generateOtp()
    setSentOtp(otp)
    setOtpDigits(Array(OTP_LENGTH).fill(''))
    setStep('otp')
    setTimeout(() => inputRefs.current[0]?.focus(), 100)
  }

  const handleDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otpDigits]
    next[index] = digit
    setOtpDigits(next)
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
  }

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerifyAndSubmit = (e) => {
    e.preventDefault()
    setError('')
    const entered = otpDigits.join('')
    if (entered.length < OTP_LENGTH) {
      setError('Enter the complete OTP')
      return
    }
    if (entered !== sentOtp) {
      setError('Incorrect OTP. Please try again.')
      return
    }

    addInquiry({
      propertyId: property?.id ?? null,
      userId: user?.id ?? null,
      userName: form.name,
      userEmail: form.email || '',
      phone: `+91 ${form.phone}`,
      budget: form.budget,
      message: form.message || `Interested in ${property?.title ?? 'this property'}. Budget: ${form.budget}.`,
      phoneVerified: true,
    })

    fireLeadEvent(property ? 'property_lead_form' : 'lead_form')

    navigate('/thank-you', { state: { leadName: form.name } })
  }

  if (step === 'otp') {
    return (
      <div className="flex flex-col gap-4">
        <button
          onClick={() => setStep('details')}
          className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary w-fit"
        >
          <ArrowLeft size={15} /> Edit details
        </button>

        <div className="text-center">
          <span className="w-12 h-12 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white mx-auto mb-2">
            <ShieldCheck size={20} />
          </span>
          <p className="text-secondary text-sm">
            Almost done — enter the 4-digit code sent to <span className="font-semibold text-primary">+91 {form.phone}</span>
          </p>
        </div>

        <div className="glass-weak rounded-[14px] px-4 py-2.5 text-center text-sm">
          Demo mode — your OTP is <span className="font-bold text-[var(--color-accent)]">{sentOtp}</span>
        </div>

        <form onSubmit={handleVerifyAndSubmit} className="flex flex-col gap-3">
          <div className="flex items-center justify-center gap-3">
            {otpDigits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleDigitKeyDown(i, e)}
                className="glass-weak w-12 h-14 rounded-[14px] text-center text-xl font-semibold outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
              />
            ))}
          </div>

          {error && <p className="text-[var(--color-danger)] text-sm text-center">{error}</p>}

          <GlassButton type="submit" className="w-full justify-center">
            <Check size={16} /> Confirm &amp; Book My Callback
          </GlassButton>
          <p className="text-tertiary text-xs text-center flex items-center justify-center gap-1">
            <Lock size={11} /> This confirms it’s really you, so our expert can call you back.
          </p>
        </form>
      </div>
    )
  }

  return (
    <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
      <GlassInput
        icon={User}
        placeholder="Your Name"
        required
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <GlassInput
        icon={Phone}
        type="tel"
        inputMode="numeric"
        placeholder="Mobile Number"
        required
        maxLength={10}
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
      />
      <GlassInput as="select" icon={IndianRupee} label="Budget" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })}>
        {budgetOptions.map((b) => <option key={b} value={b}>{b}</option>)}
      </GlassInput>
      <GlassInput
        icon={Mail}
        type="email"
        placeholder="Email (optional — to receive confirmation)"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <GlassInput
        as="textarea"
        rows={3}
        placeholder={property ? 'Any questions? e.g. site visit this weekend, loan help, negotiation…' : 'How can we help?'}
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
      />

      {error && <p className="text-[var(--color-danger)] text-sm px-1">{error}</p>}

      <GlassButton type="submit" className="w-full justify-center">
        Get My Free Callback
      </GlassButton>
      <p className="text-tertiary text-xs text-center flex items-center justify-center gap-1">
        <Lock size={11} /> Quick 4-digit code to verify your number — no spam, no obligation.
      </p>
    </form>
  )
}
