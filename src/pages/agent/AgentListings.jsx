import { useMemo } from 'react'
import { ExternalLink } from 'lucide-react'
import CollectionAdmin from '../../components/admin/CollectionAdmin'
import { emptyListing, listingFields, prepareListing, reviewOf, today } from '../../components/admin/listingForm'
import { propertyCsv } from '../../components/admin/propertyCsv'
import AgentStatusBanner from './AgentStatusBanner'
import { ListSkeleton } from '../../components/common/Skeleton'
import { useData } from '../../context/DataContext'
import { newId } from '../../utils/ids'
import { propertyPath } from '../../utils/seo'
import { useSettings } from '../../context/SettingsContext'
import { useMyAgent } from './useMyAgent'
import propertiesSeed from '../../data/properties.json'

const STATUS_STYLE = {
  approved: 'text-[var(--color-success)]',
  pending: 'text-[var(--color-warning)]',
  rejected: 'text-[var(--color-danger)]',
}
const STATUS_LABEL = { approved: 'Approved', pending: 'Waiting for review', rejected: 'Needs changes' }

/**
 * "My listings" — the agent posts, edits and removes THEIR OWN properties with the same editor the
 * admin uses. Rules enforced here (and to be enforced again on the server):
 *  • every listing is stamped with this agent and starts as pending + hidden;
 *  • the agent can never make a listing live — only the admin's approval does;
 *  • an agent cannot touch anyone else's listing;
 *  • editing a rejected listing resubmits it for review.
 */
export default function AgentListings() {
  const { user, agent, status, properties: mine } = useMyAgent()
  const { properties, propertyCrud } = useData()
  const { cities, propertyTypes, siteContent, fill } = useSettings()
  const { possession, furnishing } = siteContent.options
  const formCtx = { cities, propertyTypes, furnishing, possession }
  const schema = useMemo(() => listingFields({ ...formCtx, mode: 'agent' }), [cities, propertyTypes, furnishing, possession]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!agent) return <ListSkeleton />
  if (status === 'rejected') return <AgentStatusBanner status={status} />

  const owns = (id) => mine.some((p) => p.id === id)

  /** Applies the agent rules to a listing the agent is saving. */
  const stamp = (item) => {
    const existing = properties.find((x) => x.id === item.id)
    if (existing && existing.agentId !== agent.id) return null // someone else's listing — never touch it
    if (!existing) {
      return { ...item, agentId: agent.id, submittedBy: user.id, reviewStatus: 'pending', reviewNote: '', active: false, featured: false, verified: false, postedDate: today() }
    }
    const wasRejected = reviewOf(existing) === 'rejected'
    return {
      ...item,
      agentId: agent.id,
      submittedBy: existing.submittedBy ?? user.id,
      featured: !!existing.featured,
      verified: !!existing.verified,
      postedDate: existing.postedDate,
      reviewStatus: wasRejected ? 'pending' : reviewOf(existing),
      reviewNote: wasRejected ? '' : existing.reviewNote ?? '',
      active: wasRejected ? false : existing.active !== false && reviewOf(existing) === 'approved',
    }
  }

  const NOT_YET = 'Only approved listings can be switched on or off — this one is still waiting for review.'
  const crud = {
    ...propertyCrud,
    upsert(item) {
      const out = stamp(item)
      if (out) propertyCrud.upsert(out)
      return out ?? item
    },
    upsertMany(items) {
      const known = new Set(mine.map((p) => p.id))
      const stamped = items.map(stamp).filter(Boolean)
      stamped.forEach((p) => propertyCrud.upsert(p))
      const added = stamped.filter((p) => !known.has(p.id)).length
      return { added, updated: stamped.length - added }
    },
    remove: (id) => owns(id) && propertyCrud.remove(id),
    removeMany: (ids) => propertyCrud.removeMany(ids.filter(owns)),
    toggleActive(id) {
      const p = mine.find((x) => x.id === id)
      if (!p || reviewOf(p) !== 'approved') return { ok: false, error: NOT_YET }
      return propertyCrud.toggleActive(id)
    },
    setActive(ids, active) {
      propertyCrud.setActive(ids.filter((id) => mine.some((p) => p.id === id && reviewOf(p) === 'approved')), active)
    },
  }

  return (
    <div>
      <AgentStatusBanner status={status} />
      <CollectionAdmin
        title="My listings"
        singular="listing"
        subtitle={fill(siteContent.agentProgram.listingReviewNote)}
        items={mine}
        crud={crud}
        schema={schema}
        csv={{ config: propertyCsv, seedItems: propertiesSeed }}
        emptyItem={() => ({ ...emptyListing(formCtx), agentId: agent.id, active: false })}
        prepare={prepareListing}
        validate={(p) => (Number(p.price) > 0 ? '' : 'Enter the price in rupees (greater than 0).')}
        duplicate={(p) => ({ ...p, id: newId('p'), title: `${p.title} (copy)` })}
        searchText={(p) => `${p.title} ${p.city} ${p.locality} ${p.type} ${p.purpose}`}
        activeLabels={{ on: 'Live', off: 'Hidden' }}
        extraFilters={[
          { value: 'pending', label: 'Waiting for review', test: (p) => reviewOf(p) === 'pending' },
          { value: 'rejected', label: 'Needs changes', test: (p) => reviewOf(p) === 'rejected' },
        ]}
        rowExtras={(p) => p.active !== false && (
          <a href={propertyPath(p)} target="_blank" rel="noopener noreferrer" aria-label={`View ${p.title} on the website`} className="glass w-8 h-8 rounded-full flex items-center justify-center"><ExternalLink size={13} /></a>
        )}
        columns={[
          {
            label: 'Property',
            className: 'min-w-[240px]',
            render: (p) => (
              <div className="flex items-center gap-3">
                {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-14 h-10 rounded-[10px] object-cover shrink-0" /> : <span className="w-14 h-10 rounded-[10px] glass-weak shrink-0" />}
                <div className="min-w-0">
                  <p className="font-medium line-clamp-1">{p.title}</p>
                  <p className="text-tertiary text-xs truncate">{[p.locality, p.city].filter(Boolean).join(', ')}</p>
                </div>
              </div>
            ),
          },
          { label: 'Purpose', render: (p) => <span className="glass-weak px-2.5 py-1 rounded-full text-xs">{p.purpose}</span> },
          { label: 'Price', render: (p) => <span className="font-medium whitespace-nowrap">{p.priceLabel}</span> },
          {
            label: 'Review',
            className: 'min-w-[150px]',
            render: (p) => {
              const r = reviewOf(p)
              return (
                <div className="text-xs">
                  <p className={`font-semibold ${STATUS_STYLE[r]}`}>{STATUS_LABEL[r]}</p>
                  {r === 'rejected' && p.reviewNote && <p className="text-secondary mt-0.5">{p.reviewNote}</p>}
                </div>
              )
            },
          },
        ]}
      />
    </div>
  )
}
