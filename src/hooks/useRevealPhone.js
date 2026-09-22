import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useInterest } from '../context/InterestContext'
import { USE_API } from '../api/client'

/** "98XXXXX083" — first 2 and last 3 digits real, the middle hidden. */
export function maskPhone(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (digits.length < 6) return raw ?? ''
  return `${digits.slice(0, 2)}${'X'.repeat(digits.length - 5)}${digits.slice(-3)}`
}

/**
 * An agent's phone number stays masked until it is tapped — revealing it is one of the clearest buying signals a
 * visitor can give, so it also creates a lead. Signed in: reveals at once. Signed out: opens sign-in/sign-up
 * first (the person never has to tap twice) and reveals + creates the lead the moment that succeeds, staying on
 * this page throughout — see AuthSheet's `onSuccess`.
 */
export function useRevealPhone(agent, property) {
  const { user } = useAuth()
  const { submitLead, addInquiry } = useData()
  const { summary, profile } = useInterest()
  const outlet = useOutletContext()
  const [revealed, setRevealed] = useState(false)

  const createLead = async (authedUser) => {
    if (!agent) return
    const message = `Revealed ${agent.name}'s phone number${property ? ` for "${property.title}"` : '.'}`
    if (USE_API) {
      await submitLead({
        name: authedUser.name,
        phone: authedUser.phone,
        propertyId: property?.id,
        source: 'phone_reveal',
        message,
        profile,
      }).catch(() => {}) // never block the reveal itself on this
    } else {
      addInquiry({
        propertyId: property?.id ?? null,
        userId: authedUser.id,
        userName: authedUser.name,
        userEmail: authedUser.email || '',
        phone: `+91 ${authedUser.phone}`,
        message,
        phoneVerified: true,
        source: 'phone_reveal',
        consent: true,
        intent: 'Hot',
        interest: summary.hasSignal ? summary.line : '',
      })
    }
  }

  const reveal = (authedUser) => {
    if (revealed) return
    setRevealed(true)
    createLead(authedUser)
  }

  const onReveal = () => {
    if (revealed || !agent) return
    if (user) {
      reveal(user)
      return
    }
    outlet?.openAuth?.('login', 'reveal-phone', 'user', reveal)
  }

  return { revealed, masked: maskPhone(agent?.phone), onReveal }
}
