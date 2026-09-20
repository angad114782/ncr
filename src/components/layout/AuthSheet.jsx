import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Phone, ShieldCheck, User } from 'lucide-react'
import GlassSheet from '../glass/GlassSheet'
import GlassInput from '../glass/GlassInput'
import GlassButton from '../glass/GlassButton'
import { panelPath, useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { useData } from '../../context/DataContext'
import { useInterest } from '../../context/InterestContext'
import { leadInterest } from '../../utils/interest'

const OTP_LENGTH = 4

function generateOtp() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export default function AuthSheet({ open, onClose, initialMode = 'login', source = '', initialRole = 'user' }) {
  const [mode, setMode] = useState(initialMode)
  const [agree, setAgree] = useState(false)
  const [role, setRole] = useState(initialRole) // 'user' (client, the default) | 'agent'
  const [agentCity, setAgentCity] = useState('')
  const [agency, setAgency] = useState('')
  const [reraId, setReraId] = useState('')
  const [step, setStep] = useState('phone')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''))
  const [sentOtp, setSentOtp] = useState('')
  const [error, setError] = useState('')
  const { loginWithPhone, signupWithPhone } = useAuth()
  const { fireLeadEvent, siteContent, fill, cities } = useSettings()
  const { addInquiry, agentCrud } = useData()
  const { summary } = useInterest()
  const nudge = siteContent.nudge
  const program = siteContent.agentProgram
  const isAgentSignup = mode === 'signup' && role === 'agent' && program.enabled !== false
  const navigate = useNavigate()
  const inputRefs = useRef([])

  useEffect(() => {
    if (open) {
      setMode(initialMode)
      setRole(initialRole)
    }
  }, [open, initialMode, initialRole])

  useEffect(() => {
    if (!open) {
      setAgree(false)
      setAgentCity('')
      setAgency('')
      setReraId('')
      setStep('phone')
      setName('')
      setPhone('')
      setOtpDigits(Array(OTP_LENGTH).fill(''))
      setSentOtp('')
      setError('')
    }
  }, [open])

  const resetOtpStep = () => {
    setStep('phone')
    setOtpDigits(Array(OTP_LENGTH).fill(''))
    setSentOtp('')
    setError('')
  }

  const handleSendOtp = (e) => {
    e.preventDefault()
    setError('')
    if (!/^\d{10}$/.test(phone)) {
      setError('Enter a valid 10-digit mobile number')
      return
    }
    if (mode === 'signup' && name.trim().length < 2) {
      setError('Please enter your full name')
      return
    }
    if (isAgentSignup && !agentCity) {
      setError('Please choose the city you work in')
      return
    }
    if (mode === 'signup' && !agree) {
      setError(isAgentSignup ? 'Please tick the box to agree to the terms' : 'Please tick the box to agree, so we can send you matches')
      return
    }
    // Mock SMS gateway — in production this would trigger a real OTP send.
    const otp = generateOtp()
    setSentOtp(otp)
    setStep('otp')
    setOtpDigits(Array(OTP_LENGTH).fill(''))
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

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    e.preventDefault()
    setOtpDigits(Array.from({ length: OTP_LENGTH }, (_, i) => pasted[i] || ''))
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus()
  }

  const handleVerify = (e) => {
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

    const result = mode === 'login' ? loginWithPhone(phone) : signupWithPhone(name.trim(), phone, { role: isAgentSignup ? 'agent' : 'user', city: agentCity })
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (isAgentSignup) {
      // A new agent = a login (role "agent") plus an agent record that waits for the admin's approval.
      agentCrud.upsert({
        id: result.user.agentId,
        userId: result.user.id,
        name: name.trim(),
        role: 'Property Consultant',
        city: agentCity,
        phone: `+91 ${phone}`,
        email: '',
        avatar: '',
        rating: 0,
        dealsClosed: 0,
        status: 'pending',
        bio: '',
        agency: agency.trim(),
        reraId: reraId.trim(),
        joined: new Date().toISOString().slice(0, 10),
        active: true,
      })
      fireLeadEvent('agent_signup', { city: agentCity })
    } else if (mode === 'signup') {
      // A new, OTP-verified number that agreed to be contacted = a lead. The sales team gets the
      // visitor's interest (what they searched / viewed) so the first call is relevant.
      addInquiry({
        propertyId: summary.lastViewedId,
        userId: result.user.id,
        userName: name.trim(),
        userEmail: '',
        phone: `+91 ${phone}`,
        budget: summary.budget ? `around ₹${summary.budget.toLocaleString('en-IN')}` : '',
        message: summary.line ? `New sign-up. ${summary.line}` : 'New sign-up — no browsing history yet.',
        phoneVerified: true,
        source: source ? 'signup-prompt' : 'signup',
        consent: true,
        intent: summary.intent,
        interest: leadInterest(summary),
      })
      // Only non-identifying context goes to the ad platforms — never the name or number.
      fireLeadEvent('signup', {
        ...(summary.city ? { city: summary.city } : {}),
        ...(summary.type ? { property_type: summary.type } : {}),
        intent: summary.intent,
      })
    }
    onClose()
    // From the login prompt they stay exactly where they were browsing; otherwise go to their panel.
    if (isAgentSignup || !(mode === 'signup' && source)) navigate(panelPath(result.user))
  }

  return (
    <GlassSheet
      open={open}
      onClose={onClose}
      title={step === 'otp' ? 'Confirm It’s You' : mode === 'login' ? 'Welcome Back' : isAgentSignup ? program.title || 'Join as an agent' : 'Create Your Free Account'}
    >
      {step === 'phone' && (
        <>
          <div className="glass-weak p-1 rounded-full flex mb-6">
            {['login', 'signup'].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 rounded-full text-sm font-medium capitalize spring ${
                  mode === m ? 'glass-strong text-[var(--color-accent)]' : 'text-secondary'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
            {mode === 'signup' && program.enabled !== false && (
              <div role="radiogroup" aria-label="I am a" className="glass-weak p-1 rounded-full flex">
                {[['user', 'I’m a buyer / tenant'], ['agent', program.registerLabel || 'I’m an agent']].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={role === value}
                    onClick={() => { setRole(value); setError('') }}
                    className={`flex-1 py-2 px-2 rounded-full text-xs sm:text-sm font-medium spring ${role === value ? 'glass-strong text-[var(--color-accent)]' : 'text-secondary'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {mode === 'signup' && (
              <GlassInput
                label="Full Name"
                icon={User}
                placeholder="Kabir Singh"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <GlassInput
              label="Mobile Number"
              icon={Phone}
              type="tel"
              inputMode="numeric"
              placeholder="98XXXXXXXX"
              maxLength={10}
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            />

            {isAgentSignup && (
              <>
                <GlassInput as="select" label="City you work in" value={agentCity} onChange={(e) => setAgentCity(e.target.value)} required>
                  <option value="">Select city…</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </GlassInput>
                <GlassInput label="Agency / company (optional)" value={agency} onChange={(e) => setAgency(e.target.value)} />
                <GlassInput label="RERA agent registration no. (optional)" value={reraId} onChange={(e) => setReraId(e.target.value)} />
              </>
            )}

            {error && <p className="text-[var(--color-danger)] text-sm px-1">{error}</p>}

            {mode === 'login' && (
              <p className="text-tertiary text-xs px-1">
                Demo numbers: 8619930583 (admin) or 9820011122 (user)
              </p>
            )}

            {mode === 'signup' && (
              <>
                <ul className="glass-weak rounded-[16px] p-4 flex flex-col gap-2">
                  {!isAgentSignup && summary.focus && (
                    <li className="text-xs text-secondary pb-1">
                      Matching you with <strong className="text-primary">{summary.focus}</strong>
                    </li>
                  )}
                  {((isAgentSignup ? program.benefits : nudge.benefits) ?? []).map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm">
                      <Check size={15} className="text-[var(--color-success)] mt-0.5 shrink-0" />
                      <span>{fill(b)}</span>
                    </li>
                  ))}
                </ul>
                <label className="flex items-start gap-2.5 text-xs text-secondary leading-relaxed cursor-pointer">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--color-accent)] shrink-0" />
                  <span>
                    {fill(isAgentSignup ? program.consentText : nudge.consentText)}{' '}
                    <Link to="/terms" onClick={onClose} className="text-[var(--color-accent)] font-medium underline underline-offset-2">Terms</Link>{' · '}
                    <Link to="/privacy" onClick={onClose} className="text-[var(--color-accent)] font-medium underline underline-offset-2">Privacy Policy</Link>
                  </span>
                </label>
              </>
            )}

            <GlassButton type="submit" className="mt-2 w-full justify-center">
              {mode === 'login' ? 'Send Me a Secure Code' : isAgentSignup ? 'Register as an agent' : 'Create My Free Account'}
            </GlassButton>
            <p className="text-tertiary text-xs text-center">We’ll text a 4-digit code to confirm it’s you — no password to remember.</p>
          </form>
        </>
      )}

      {step === 'otp' && (
        <div className="flex flex-col gap-4">
          <button
            onClick={resetOtpStep}
            className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary w-fit"
          >
            <ArrowLeft size={15} /> Change number
          </button>

          <div className="text-center">
            <span className="w-14 h-14 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white mx-auto mb-3">
              <ShieldCheck size={24} />
            </span>
            <p className="text-secondary text-sm">
              You’re one step away — enter the 4-digit code sent to <span className="font-semibold text-primary">+91 {phone}</span>
            </p>
          </div>

          <div className="glass-weak rounded-[14px] px-4 py-2.5 text-center text-sm">
            Demo mode — your OTP is <span className="font-bold text-[var(--color-accent)]">{sentOtp}</span>
          </div>

          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-3" onPaste={handlePaste}>
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
              {mode === 'login' ? 'Confirm & Take Me In' : isAgentSignup ? 'Confirm & Open My Panel' : 'Confirm & Start Exploring'}
            </GlassButton>

            <button
              type="button"
              onClick={handleSendOtp}
              className="text-sm text-[var(--color-accent)] font-medium text-center"
            >
              Didn’t get the code? Send it again
            </button>
          </form>
        </div>
      )}
    </GlassSheet>
  )
}
