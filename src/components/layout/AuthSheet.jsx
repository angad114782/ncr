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
import { USE_API } from '../../api/client'

const LOCAL_OTP_LENGTH = 4 // the mock code; with the server the length comes from its answer

function generateOtp() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export default function AuthSheet({ open, onClose, initialMode = 'login', source = '', initialRole = 'user', onSuccess = null }) {
  const [mode, setMode] = useState(initialMode)
  const [agree, setAgree] = useState(false)
  const [role, setRole] = useState(initialRole) // 'user' (client, the default) | 'agent'
  const [agentCity, setAgentCity] = useState('')
  const [agency, setAgency] = useState('')
  const [reraId, setReraId] = useState('')
  const [step, setStep] = useState('phone')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [otpLen, setOtpLen] = useState(LOCAL_OTP_LENGTH)
  const [otpDigits, setOtpDigits] = useState(Array(LOCAL_OTP_LENGTH).fill(''))
  const [sentOtp, setSentOtp] = useState('') // local mock code, or (dev servers) the code the API returned
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { user, logout, loginWithPhone, signupWithPhone, sendOtp, loginWithOtp, registerWithOtp, findByPhone } = useAuth()
  const { fireLeadEvent, siteContent, fill, cities } = useSettings()
  const { addInquiry, agentCrud } = useData()
  const { summary, profile } = useInterest()
  const nudge = siteContent.nudge
  const program = siteContent.agentProgram
  const isAgentSignup = mode === 'signup' && role === 'agent' && program.enabled !== false
  const listFlow = source === 'list' // opened from "List My Property": agents only (log in or register), no buyer accounts
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
      setOtpLen(LOCAL_OTP_LENGTH)
      setOtpDigits(Array(LOCAL_OTP_LENGTH).fill(''))
      setSentOtp('')
      setBusy(false)
      setError('')
    }
  }, [open])

  const resetOtpStep = () => {
    setStep('phone')
    setOtpDigits(Array(otpLen).fill(''))
    setSentOtp('')
    setError('')
  }

  /** Puts the OTP step for the phone number in front of the person, having just resolved whether it is a login or a sign-up. */
  const goToOtpStep = (resolvedMode, d) => {
    setMode(resolvedMode)
    const len = d?.length ?? LOCAL_OTP_LENGTH
    setOtpLen(len)
    setSentOtp(d?.devOtp ?? '')
    setOtpDigits(Array(len).fill(''))
    setStep('otp')
    setTimeout(() => inputRefs.current[0]?.focus(), 100)
  }

  /**
   * One number, one flow: always sends a code, whether or not the number already has an account — there is no
   * separate login/sign-up step to pick. If a code for an existing account can't be sent (no account yet), the
   * same click quietly continues as a sign-up instead, and the OTP step then also asks for the extra details
   * (name, and for the agent door, city) a new account needs.
   */
  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')
    if (!/^\d{10}$/.test(phone)) {
      setError('Enter a valid 10-digit mobile number')
      return
    }
    if (USE_API) {
      // The server sends the code on WhatsApp (and, on a development server, returns it so it can be typed in).
      setBusy(true)
      try {
        const d = await sendOtp(phone, 'login')
        goToOtpStep('login', d)
      } catch (err) {
        if (err.status === 404) {
          try {
            const d = await sendOtp(phone, 'register')
            goToOtpStep('signup', d)
          } catch (err2) {
            setError(err2.message)
          }
        } else {
          setError(err.message)
        }
      } finally {
        setBusy(false)
      }
      return
    }
    // Local mode: no server round-trip needed to know which one this is — a mock code either way.
    goToOtpStep(findByPhone(phone) ? 'login' : 'signup', { devOtp: generateOtp() })
  }

  const handleDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otpDigits]
    next[index] = digit
    setOtpDigits(next)
    if (digit && index < otpLen - 1) inputRefs.current[index + 1]?.focus()
  }

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, otpLen)
    if (!pasted) return
    e.preventDefault()
    setOtpDigits(Array.from({ length: otpLen }, (_, i) => pasted[i] || ''))
    inputRefs.current[Math.min(pasted.length, otpLen - 1)]?.focus()
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    const entered = otpDigits.join('')
    if (entered.length < otpLen) {
      setError('Enter the complete OTP')
      return
    }
    if (mode === 'signup') {
      if (name.trim().length < 2) {
        setError('Please enter your full name')
        return
      }
      if (isAgentSignup && !agentCity) {
        setError('Please choose the city you work in')
        return
      }
      if (!agree) {
        setError(isAgentSignup ? 'Please tick the box to agree to the terms' : 'Please tick the box to agree, so we can send you matches')
        return
      }
    }
    if (!USE_API && entered !== sentOtp) {
      setError('Incorrect OTP. Please try again.')
      return
    }

    let result
    if (USE_API) {
      // The server checks the code, creates the account (a client also becomes a lead with the visitor's interest,
      // an agent gets a pending agent record) and stores the consent — nothing else to save here.
      setBusy(true)
      result =
        mode === 'login'
          ? await loginWithOtp(phone, entered)
          : await registerWithOtp({
              phone,
              otp: entered,
              name: name.trim(),
              role: isAgentSignup ? 'agent' : 'user',
              ...(isAgentSignup ? { city: agentCity, agency: agency.trim(), reraId: reraId.trim() } : {}),
              consent: { accepted: true },
              ...(source ? { source: source === 'picked' ? 'picked' : 'nudge' } : {}),
              ...(isAgentSignup ? {} : { profile }),
            })
      setBusy(false)
    } else {
      result = mode === 'login' ? loginWithPhone(phone) : signupWithPhone(name.trim(), phone, { role: isAgentSignup ? 'agent' : 'user', city: agentCity })
    }
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (listFlow && mode === 'login' && result.user.role === 'user') {
      // This door is for agents. A buyer / tenant number is signed straight out again and told what to do.
      logout()
      setStep('phone')
      setOtpDigits(Array(otpLen).fill(''))
      setSentOtp('')
      setError('This number has a buyer account, not an agent account. To list a property, register as an agent with a different mobile number.')
      return
    }
    if (!listFlow && mode === 'login' && result.user.role === 'agent') {
      // The reverse: this is the buyer/tenant door. An agent number is signed straight out again.
      logout()
      setStep('phone')
      setOtpDigits(Array(otpLen).fill(''))
      setSentOtp('')
      setError('This number has an agent account. Agents sign in from “Add Listing” or “List My Property”.')
      return
    }
    if (USE_API && mode === 'signup') {
      if (isAgentSignup) fireLeadEvent('agent_signup', { city: agentCity })
      else fireLeadEvent('signup', { ...(summary.city ? { city: summary.city } : {}), ...(summary.type ? { property_type: summary.type } : {}), intent: summary.intent })
    } else if (isAgentSignup) {
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
      // Local mode: a new, OTP-verified number that agreed to be contacted = a lead. The sales team gets the
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
    if (onSuccess) {
      // e.g. revealing an agent's phone number: stay exactly on this page and hand the now-signed-in user back —
      // never redirect to a panel for this.
      onSuccess(result.user)
      return
    }
    // From the login prompt they stay exactly where they were browsing; otherwise go to their panel.
    // Coming from "List My Property", an agent lands on "My listings" to post the property right away.
    const home = source === 'list' && result.user.role === 'agent' ? '/agent/listings' : panelPath(result.user)
    if (isAgentSignup || !(mode === 'signup' && source)) navigate(home)
  }

  return (
    <GlassSheet
      open={open}
      onClose={onClose}
      title={step === 'otp' ? 'Confirm It’s You' : mode === 'login' ? (listFlow ? 'Agent login' : 'Welcome Back') : isAgentSignup ? program.title || 'Join as an agent' : 'Create Your Free Account'}
    >
      {step === 'phone' && (
        <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
          {listFlow && user && user.role !== 'agent' && (
            <p role="status" className="glass-weak rounded-[14px] px-4 py-3 text-sm text-secondary leading-relaxed">
              You are signed in as {user.role === 'admin' ? 'the admin' : 'a buyer / tenant'} ({user.name || user.phone}). Continuing with an agent number signs you out of that account.
            </p>
          )}
          {listFlow && program.listIntro && (
            <p className="glass-weak rounded-[14px] px-4 py-3 text-sm text-secondary leading-relaxed">{fill(program.listIntro)}</p>
          )}
          <GlassInput
            label="Mobile Number"
            icon={Phone}
            type="tel"
            inputMode="numeric"
            placeholder="98XXXXXXXX"
            maxLength={10}
            required
            autoFocus
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          />

          {error && <p className="text-[var(--color-danger)] text-sm px-1">{error}</p>}

          {!USE_API && (
            <p className="text-tertiary text-xs px-1">
              Demo numbers: 8619930583 (admin) or 9820011122 (user) — any other number continues as a new account.
            </p>
          )}

          <GlassButton type="submit" disabled={busy} className="mt-2 w-full justify-center">
            Send Me a Secure Code
          </GlassButton>
          <p className="text-tertiary text-xs text-center">
            No password to remember. New here? The same code {listFlow ? 'sets up your agent account' : 'creates your free account'} — no separate sign-up step.
          </p>
        </form>
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
              You’re one step away — enter the {otpLen}-digit code sent to <span className="font-semibold text-primary">+91 {phone}</span>
            </p>
          </div>

          {sentOtp ? (
            <div className="glass-weak rounded-[14px] px-4 py-2.5 text-center text-sm">
              Demo mode — your OTP is <span className="font-bold text-[var(--color-accent)]">{sentOtp}</span>
            </div>
          ) : (
            <p className="text-tertiary text-xs text-center">The code was sent to your WhatsApp. It stays valid for a few minutes.</p>
          )}

          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
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
                  className="glass-weak w-10 sm:w-12 h-14 rounded-[14px] text-center text-xl font-semibold outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
                />
              ))}
            </div>

            {mode === 'signup' && (
              <>
                <p className="text-sm text-secondary -mt-1">
                  {listFlow ? "There's no account for this number yet — a few details to set up your agent account:" : "There's no account for this number yet — a few details to create your free account:"}
                </p>
                <GlassInput
                  label="Full Name"
                  icon={User}
                  placeholder="Kabir Singh"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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

            {error && <p className="text-[var(--color-danger)] text-sm text-center">{error}</p>}

            <GlassButton type="submit" disabled={busy} className="w-full justify-center">
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
