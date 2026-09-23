import { Check, ExternalLink, Star, X } from 'lucide-react'
import CollectionAdmin from '../../components/admin/CollectionAdmin'
import { useData } from '../../context/DataContext'
import { emptyListing, listingFields, prepareListing, reviewOf } from '../../components/admin/listingForm'
import { useSettings } from '../../context/SettingsContext'
import { propertyCsv } from '../../components/admin/propertyCsv'
import { newId } from '../../utils/ids'
import { propertyPath, slugify } from '../../utils/seo'
import propertiesSeed from '../../data/properties.json'
import PropertyAnalytics from './PropertyAnalytics'


export default function ManageListings() {
  const { properties, agents, propertyCrud, restoreSeeds } = useData()
  const { cities, propertyTypes, siteContent } = useSettings()
  const { possession, furnishing } = siteContent.options

  const formCtx = { cities, propertyTypes, furnishing, possession }
  const schema = listingFields({ ...formCtx, agents, mode: 'admin' })
  const emptyItem = () => emptyListing(formCtx)
  const prepare = prepareListing

  // Agent-submitted listings wait for review. Making one live (approve / activate) also approves it,
  // but only once its agent has been approved — otherwise an unapproved agent's contact would go public.
  const agentBlock = (p) => {
    const agent = p.agentId ? agents.find((a) => a.id === p.agentId) : null
    return agent && agent.status && agent.status !== 'approved' ? `Approve the agent “${agent.name}” first (Admin → Agents).` : ''
  }
  const approve = (id) => {
    const p = properties.find((x) => x.id === id)
    const block = p && agentBlock(p)
    if (block) return { ok: false, error: block }
    propertyCrud.patch(id, { reviewStatus: 'approved', active: true })
    return { ok: true }
  }
  const crud = {
    ...propertyCrud,
    toggleActive: (id) => {
      const p = properties.find((x) => x.id === id)
      if (p && p.active === false && reviewOf(p) !== 'approved') return approve(id)
      return propertyCrud.toggleActive(id)
    },
    setActive: (ids, active) => {
      if (!active) return propertyCrud.setActive(ids, false)
      ids.forEach((id) => {
        const p = properties.find((x) => x.id === id)
        if (p && reviewOf(p) !== 'approved') approve(id)
        else propertyCrud.setActive([id], true)
      })
    },
  }
  const pending = properties.filter((p) => reviewOf(p) === 'pending')

  return (
    <CollectionAdmin
      title="Listings"
      singular="listing"
      items={properties}
      crud={crud}
      extraFilters={[{ value: 'pending', label: `Pending review${pending.length ? ` (${pending.length})` : ''}`, test: (p) => reviewOf(p) === 'pending' }]}
      editOnRowClick
      editExtra={(p) => <PropertyAnalytics propertyId={p.id} />}
      schema={schema}
      csv={{ config: propertyCsv, seedItems: propertiesSeed }}
      restore={() => restoreSeeds('properties')}
      emptyItem={emptyItem}
      prepare={prepare}
      validate={(p, { items }) => {
        if (!(Number(p.price) > 0)) return 'Enter the price in rupees (greater than 0).'
        const slug = slugify(p.slug || '')
        const clash = slug && items.find((x) => x.id !== p.id && (x.slug === slug || x.previousSlugs?.includes(slug) || x.id === slug))
        return clash ? `Another listing (“${clash.title}”) already uses the URL “${slug}”. Change it, or leave the slug blank to generate a unique one.` : ''
      }}
      duplicate={(p) => ({ ...p, id: newId('p'), title: `${p.title} (copy)`, active: false, featured: false })}
      searchText={(p) => `${p.title} ${p.city} ${p.locality} ${p.type} ${p.purpose}`}
      rowExtras={(p, { flash }) => (
        <>
          {reviewOf(p) === 'pending' && (
            <button type="button" aria-label={`Approve ${p.title}`} title="Approve and publish" onClick={() => { const r = approve(p.id); flash(r.ok ? 'Approved and live.' : r.error) }} className="glass w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-success)]"><Check size={13} /></button>
          )}
          {reviewOf(p) === 'pending' && (
            <button type="button" aria-label={`Reject ${p.title}`} title="Reject" onClick={() => { propertyCrud.patch(p.id, { reviewStatus: 'rejected', active: false }); flash('Rejected — add a note to the agent by editing the listing.') }} className="glass w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-danger)]"><X size={13} /></button>
          )}
          {p.active !== false && (
            <a href={propertyPath(p)} target="_blank" rel="noopener noreferrer" aria-label={`View ${p.title} on the website`} className="glass w-8 h-8 rounded-full flex items-center justify-center"><ExternalLink size={13} /></a>
          )}
        </>
      )}
      columns={[
        {
          label: 'Property',
          className: 'min-w-[260px]',
          render: (p) => (
            <div className="flex items-center gap-3">
              {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-14 h-10 rounded-[10px] object-cover shrink-0" /> : <span className="w-14 h-10 rounded-[10px] glass-weak shrink-0" />}
              <div className="min-w-0">
                <p className="font-medium line-clamp-1">{p.title}{p.featured && <Star size={12} className="inline ml-1.5 -mt-0.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />}</p>
                <p className="text-tertiary text-xs truncate">{[p.locality, p.city].filter(Boolean).join(', ')}</p>
              </div>
            </div>
          ),
        },
        { label: 'Purpose', render: (p) => <span className="glass-weak px-2.5 py-1 rounded-full text-xs">{p.purpose}</span> },
        { label: 'Price', render: (p) => <span className="font-medium whitespace-nowrap">{p.priceLabel}</span> },
        {
          label: 'Posted by',
          render: (p) => {
            const agent = p.agentId ? agents.find((a) => a.id === p.agentId) : null
            const r = reviewOf(p)
            return (
              <div className="text-xs">
                <p className="text-secondary">{p.submittedBy ? `Agent: ${agent?.name ?? 'unknown'}` : 'Admin'}</p>
                {r !== 'approved' && <p className={`font-semibold capitalize ${r === 'pending' ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]'}`}>{r}</p>}
              </div>
            )
          },
        },
      ]}
    />
  )
}
