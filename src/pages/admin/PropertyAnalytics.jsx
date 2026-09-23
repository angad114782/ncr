import { useEffect, useState } from 'react'
import { BarChart3, Eye, MessageSquare } from 'lucide-react'
import { USE_API, api } from '../../api/client'

/**
 * Read-only "who's interested in this one listing" panel, shown above the edit form for an
 * existing property (see ManageListings.jsx's `editExtra`). Two sources, both already used
 * elsewhere in the admin panel:
 *  - views: signed-in visitors who opened this listing (Event, type 'view') — never anonymous
 *    browsing, which stays on-device only (docs/rules.md §15), same caveat as Search Analytics.
 *  - enquiries: everyone who filled the lead form on it (Lead) — always has a phone number.
 */
export default function PropertyAnalytics({ propertyId }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!USE_API || !propertyId) return
    setData(null)
    setError('')
    api(`/admin/properties/${propertyId}/analytics`)
      .then(setData)
      .catch((err) => setError(err.message))
  }, [propertyId])

  if (!USE_API) return null

  return (
    <div className="glass-weak rounded-[16px] p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <BarChart3 size={15} className="text-[var(--color-accent)]" /> Activity on this listing
      </div>

      {error && <p className="text-[var(--color-danger)] text-xs">{error}</p>}
      {!data && !error && <p className="text-secondary text-xs">Loading…</p>}

      {data && (
        <>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5"><Eye size={14} className="text-tertiary" /> {data.totalViews} view{data.totalViews === 1 ? '' : 's'}</span>
            <span className="flex items-center gap-1.5"><MessageSquare size={14} className="text-tertiary" /> {data.leads.length} enquir{data.leads.length === 1 ? 'y' : 'ies'}</span>
          </div>
          <p className="text-tertiary text-[11px] -mt-1">
            Views count only signed-in visitors — most browsing is anonymous and, by design, never reaches the server.
          </p>

          {data.visitors.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-secondary mb-1.5">Signed-in visitors (with mobile number)</p>
              <ul className="flex flex-col gap-1">
                {data.visitors.map((v) => (
                  <li key={v.phone} className="flex items-center justify-between text-xs glass rounded-[10px] px-3 py-2">
                    <span>{v.name || 'Unnamed'} · +91 {v.phone}</span>
                    <span className="text-tertiary shrink-0">{v.views} view{v.views === 1 ? '' : 's'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.leads.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-secondary mb-1.5">Enquiries</p>
              <ul className="flex flex-col gap-1">
                {data.leads.map((l) => (
                  <li key={l.id} className="flex items-center justify-between text-xs glass rounded-[10px] px-3 py-2">
                    <span>{l.name} · +91 {l.phone}{l.phoneVerified ? '' : ' (unverified)'}</span>
                    <span className="text-tertiary shrink-0">{new Date(l.createdAt).toLocaleDateString('en-IN')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.visitors.length === 0 && data.leads.length === 0 && (
            <p className="text-secondary text-xs">No recorded activity yet.</p>
          )}
        </>
      )}
    </div>
  )
}
