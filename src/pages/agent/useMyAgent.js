import { useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { today } from '../../components/admin/listingForm'

/**
 * The signed-in agent's own data: their agent record (public profile + approval status), their
 * listings and the enquiries that came in on those listings.
 *
 * An agent account created by the admin (Users → role "agent") has no agent record yet — one is
 * created here as "pending" so the admin still approves it before anything goes public.
 */
export function useMyAgent() {
  const { user } = useAuth()
  const { agents, agentCrud, properties, inquiries } = useData()

  const agent = user ? agents.find((a) => a.id === user.agentId) ?? agents.find((a) => a.userId === user.id) : undefined

  useEffect(() => {
    if (!user || agent) return
    agentCrud.upsert({
      id: user.agentId ?? `a${user.id}`,
      userId: user.id,
      name: user.name,
      role: 'Property Consultant',
      city: user.city ?? '',
      phone: user.phone ? `+91 ${user.phone}` : '',
      email: '',
      avatar: user.avatar ?? '',
      rating: 0,
      dealsClosed: 0,
      status: 'pending',
      bio: '',
      agency: '',
      reraId: '',
      joined: today(),
      active: true,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, !!agent])

  const mine = agent ? properties.filter((p) => p.agentId === agent.id) : []
  const myIds = new Set(mine.map((p) => p.id))
  const leads = inquiries.filter((i) => i.propertyId && myIds.has(i.propertyId))

  return { user, agent, status: agent?.status ?? 'pending', properties: mine, leads }
}
