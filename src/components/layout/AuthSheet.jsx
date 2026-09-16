import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, ShieldCheck, User } from 'lucide-react'
import GlassSheet from '../glass/GlassSheet'
import GlassInput from '../glass/GlassInput'
import GlassButton from '../glass/GlassButton'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'

const OTP_LENGTH = 4

function generateOtp() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export default function AuthSheet({ open, onClose }) {
  const [mode, setMode] = useState('login')
  const [step, setStep] = useState('phone')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''))
  const [sentOtp, setSentOtp] = useState('')
  const [error, setError] = useState('')
  const { loginWithPhone, signupWithPhone } = useAuth()
  const { fireLeadEvent } = useSettings()
  const navigate = useNavigate()
  const inputRefs = useRef([])

  useEffect(() => {
    if (!open) {
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

    const result = mode === 'login' ? loginWithPhone(phone) : signupWithPhone(name.trim(), phone)
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (mode === 'signup') fireLeadEvent('signup')
    onClose()
    navigate(result.user.role === 'admin' ? '/admin' : '/dashboard')
  }

  return (
    <GlassSheet
      open={open}
      onClose={onClose}
      title={step === 'otp' ? 'Verify OTP' : mode === 'login' ? 'Welcome Back' : 'Create Account'}
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

            {error && <p className="text-[var(--color-danger)] text-sm px-1">{error}</p>}

            {mode === 'login' && (
              <p className="text-tertiary text-xs px-1">
                Demo numbers: 8619930583 (admin) or 9820011122 (user)
              </p>
            )}

            <GlassButton type="submit" className="mt-2 w-full justify-center">
              Send OTP
            </GlassButton>
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
              Enter the 4-digit code sent to <span className="font-semibold text-primary">+91 {phone}</span>
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
              Verify &amp; {mode === 'login' ? 'Sign In' : 'Create Account'}
            </GlassButton>

            <button
              type="button"
              onClick={handleSendOtp}
              className="text-sm text-[var(--color-accent)] font-medium text-center"
            >
              Resend OTP
            </button>
          </form>
        </div>
      )}
    </GlassSheet>
  )
}
