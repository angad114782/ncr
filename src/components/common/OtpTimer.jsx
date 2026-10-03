import { useEffect, useState } from 'react'
import { Clock, RotateCw } from 'lucide-react'

export const OTP_DEFAULT_TTL_SECONDS = 300
export const OTP_RESEND_COOLDOWN_SECONDS = 30 // the server refuses a second code sooner than this

/** The two moments a freshly sent code needs: when it expires and when "Resend" unlocks. */
export const otpClock = (expiresInSeconds) => ({
  expiresAt: Date.now() + (Number(expiresInSeconds) || OTP_DEFAULT_TTL_SECONDS) * 1000,
  resendAt: Date.now() + OTP_RESEND_COOLDOWN_SECONDS * 1000,
})

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/**
 * Under the code boxes: a live "expires in 4:32" countdown and a Resend button that unlocks after the cooldown
 * (immediately once the code has expired). `onResend` sends a fresh code; it should set new `expiresAt` / `resendAt`.
 */
export default function OtpTimer({ expiresAt, resendAt, onResend, busy = false, className = '' }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const left = Math.max(0, Math.ceil((expiresAt - now) / 1000))
  const wait = Math.max(0, Math.ceil((resendAt - now) / 1000))
  const expired = left === 0

  return (
    <div className={`flex flex-col items-center gap-1.5 text-sm ${className}`}>
      <p className={`flex items-center gap-1.5 ${expired ? 'text-[var(--color-danger)] font-medium' : 'text-tertiary'}`} role="status">
        <Clock size={13} /> {expired ? 'This code has expired — please request a new one.' : `Code expires in ${mmss(left)}`}
      </p>
      <button
        type="button"
        onClick={onResend}
        disabled={busy || (!expired && wait > 0)}
        className="inline-flex items-center gap-1.5 font-medium text-[var(--color-accent)] disabled:text-tertiary disabled:cursor-not-allowed"
      >
        <RotateCw size={13} className={busy ? 'animate-spin' : ''} />
        {busy ? 'Sending…' : !expired && wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
      </button>
    </div>
  )
}
