import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Copy, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react'
import GlassCard from '../glass/GlassCard'
import GlassButton from '../glass/GlassButton'
import GlassSheet from '../glass/GlassSheet'
import SchemaForm, { getPath } from './SchemaForm'
import CsvToolbar from './CsvToolbar'
import Toggle from './Toggle'

const isEmpty = (v) => v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0)

/**
 * The one admin screen used for listings, blog posts, FAQs, testimonials, agents…
 * search · status filter · add / edit / duplicate / delete · active toggle ·
 * bulk actions · reorder · CSV template / export / import · restore sample content.
 * Everything entity-specific is passed in as props (schema, columns, csv config).
 */
export default function CollectionAdmin({
  title,
  subtitle,
  singular = 'item',
  items,
  crud, // { upsert, upsertMany, remove, removeMany, setActive, toggleActive, move? }
  columns, // [{ label, render(item), className? }]
  schema, // fields[] or (items) => fields[]
  emptyItem, // () => new item
  prepare, // (item, { isNew, items }) => item — normalise before saving
  validate, // (item, { isNew, items }) => error string
  duplicate, // (item) => copy
  csv, // { config, seedItems }
  searchText = (item) => JSON.stringify(item),
  activeLabels = { on: 'Active', off: 'Inactive' },
  reorderable = false,
  restore, // () => void — back to the bundled sample content
  headerExtras,
  rowExtras,
  sheetWidth = 'max-w-3xl',
  itemLabel = (x) => x.title ?? x.question ?? x.name ?? x.id,
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all') // all | active | inactive
  const [selected, setSelected] = useState(() => new Set())
  const [draft, setDraft] = useState(null) // { item, isNew }
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(null) // { message, run }
  const [notice, setNotice] = useState('')

  const fields = typeof schema === 'function' ? schema(items) : schema

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((it) => {
      if (status === 'active' && it.active === false) return false
      if (status === 'inactive' && it.active !== false) return false
      return !q || searchText(it).toLowerCase().includes(q)
    })
  }, [items, query, status, searchText])

  const activeCount = items.filter((i) => i.active !== false).length
  const allSelected = visible.length > 0 && visible.every((i) => selected.has(i.id))

  const flash = (msg) => {
    setNotice(msg)
    setTimeout(() => setNotice(''), 3500)
  }

  const openAdd = () => { setError(''); setDraft({ item: emptyItem(), isNew: true }) }
  const openEdit = (item) => { setError(''); setDraft({ item: JSON.parse(JSON.stringify(item)), isNew: false }) }

  const handleSave = (e) => {
    e.preventDefault()
    const missing = fields.find((f) => f.required && f.type !== 'custom' && isEmpty(getPath(draft.item, f.key)))
    if (missing) return setError(`${missing.label} is required.`)
    const ctx = { isNew: draft.isNew, items }
    const problem = validate?.(draft.item, ctx)
    if (problem) return setError(problem)
    const saved = prepare ? prepare(draft.item, ctx) : draft.item
    // Some stores (users) can refuse a change — show the reason instead of closing the form.
    const res = crud.upsert(saved)
    if (res && res.ok === false) return setError(res.error)
    setDraft(null)
    flash(`${draft.isNew ? 'Added' : 'Saved'} “${itemLabel(saved)}”.`)
  }

  const askDelete = (item) =>
    setConfirm({
      message: `Delete “${itemLabel(item)}”? This can’t be undone.`,
      run: () => {
        const res = crud.remove(item.id)
        if (res && res.ok === false) return flash(res.error)
        setSelected((s) => { const n = new Set(s); n.delete(item.id); return n })
        flash('Deleted.')
      },
    })

  const toggleSelect = (id) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(visible.map((i) => i.id)))
  const ids = [...selected]

  const bulk = (action) => {
    if (action === 'delete') {
      return setConfirm({ message: `Delete ${ids.length} ${singular}${ids.length > 1 ? 's' : ''}? This can’t be undone.`, run: () => { crud.removeMany(ids); setSelected(new Set()); flash('Deleted.') } })
    }
    crud.setActive(ids, action === 'activate')
    flash(`${ids.length} ${action === 'activate' ? activeLabels.on.toLowerCase() : activeLabels.off.toLowerCase()}.`)
    setSelected(new Set())
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
          <p className="text-secondary">
            {items.length} total · {activeCount} {activeLabels.on.toLowerCase()}{subtitle ? ` · ${subtitle}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {headerExtras}
            {restore && (
              <GlassButton variant="glass" size="sm" icon={RotateCcw} onClick={() => setConfirm({ message: `Replace all ${title.toLowerCase()} with the bundled sample content? Your changes will be lost.`, run: () => { restore(); flash('Sample content restored.') } })}>
                Restore samples
              </GlassButton>
            )}
            <GlassButton icon={Plus} onClick={openAdd}>Add {singular}</GlassButton>
          </div>
          {csv && <CsvToolbar config={csv.config} items={items} seedItems={csv.seedItems} onImport={crud.upsertMany} itemLabel={itemLabel} />}
        </div>
      </div>

      {notice && <p role="status" className="mb-3 text-sm text-[var(--color-success)] font-medium">{notice}</p>}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="glass-weak rounded-full flex items-center gap-2 px-4 h-10 flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="text-tertiary" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`} aria-label={`Search ${title}`} className="bg-transparent outline-none w-full text-sm" />
        </div>
        <div className="glass-weak p-1 rounded-full flex">
          {[['all', 'All'], ['active', activeLabels.on], ['inactive', activeLabels.off]].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setStatus(v)} className={`px-3.5 py-1.5 rounded-full text-xs font-medium spring ${status === v ? 'glass-strong text-[var(--color-accent)]' : 'text-secondary'}`}>{l}</button>
          ))}
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2 glass-strong rounded-full pl-4 pr-2 py-1.5">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <GlassButton size="sm" variant="glass" onClick={() => bulk('activate')}>{activeLabels.on}</GlassButton>
            <GlassButton size="sm" variant="glass" onClick={() => bulk('deactivate')}>{activeLabels.off}</GlassButton>
            <GlassButton size="sm" variant="danger" onClick={() => bulk('delete')}>Delete</GlassButton>
          </div>
        )}
      </div>

      <GlassCard hover={false} className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-secondary border-b border-[var(--glass-border)]">
                <th className="p-4 w-10"><input type="checkbox" aria-label="Select all" checked={allSelected} onChange={toggleAll} className="accent-[var(--color-accent)]" /></th>
                {columns.map((c) => <th key={c.label} className={`p-4 ${c.className ?? ''}`}>{c.label}</th>)}
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id} className="border-b border-[var(--glass-border)] last:border-0 align-middle">
                  <td className="p-4"><input type="checkbox" aria-label={`Select ${itemLabel(item)}`} checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} className="accent-[var(--color-accent)]" /></td>
                  {columns.map((c) => <td key={c.label} className={`p-4 ${c.className ?? ''}`}>{c.render(item)}</td>)}
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Toggle checked={item.active !== false} onChange={() => { const res = crud.toggleActive(item.id); if (res && res.ok === false) flash(res.error) }} label={`${item.active !== false ? activeLabels.off : activeLabels.on}: ${itemLabel(item)}`} />
                      <span className="text-xs text-secondary hidden lg:inline">{item.active !== false ? activeLabels.on : activeLabels.off}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1.5">
                      {rowExtras?.(item)}
                      {reorderable && !query && status === 'all' && (
                        <>
                          <button type="button" aria-label="Move up" onClick={() => crud.move(item.id, -1)} className="glass w-8 h-8 rounded-full flex items-center justify-center"><ArrowUp size={13} /></button>
                          <button type="button" aria-label="Move down" onClick={() => crud.move(item.id, 1)} className="glass w-8 h-8 rounded-full flex items-center justify-center"><ArrowDown size={13} /></button>
                        </>
                      )}
                      <button type="button" aria-label={`Edit ${itemLabel(item)}`} onClick={() => openEdit(item)} className="glass w-8 h-8 rounded-full flex items-center justify-center"><Pencil size={13} /></button>
                      {duplicate && (
                        <button type="button" aria-label={`Duplicate ${itemLabel(item)}`} onClick={() => { crud.upsert(duplicate(item)); flash('Duplicated (saved as inactive).') }} className="glass w-8 h-8 rounded-full flex items-center justify-center"><Copy size={13} /></button>
                      )}
                      <button type="button" aria-label={`Delete ${itemLabel(item)}`} onClick={() => askDelete(item)} className="glass w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-danger)]"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={columns.length + 3} className="p-10 text-center text-secondary">{items.length === 0 ? `No ${title.toLowerCase()} yet — add one or import a CSV.` : 'Nothing matches your search or filter.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassSheet open={!!draft} onClose={() => setDraft(null)} title={draft?.isNew ? `Add ${singular}` : `Edit ${singular}`} maxWidth={sheetWidth}>
        {draft && (
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            <SchemaForm schema={fields} value={draft.item} onChange={(next) => setDraft((d) => ({ ...d, item: next }))} />
            {error && <p role="alert" className="text-[var(--color-danger)] text-sm">{error}</p>}
            <div className="flex gap-2 sticky bottom-0 -mx-2 px-2 py-2 rounded-[20px] bg-[var(--bg-base)]/90 backdrop-blur-md shadow-[0_-8px_20px_rgba(0,0,0,0.06)]">
              <GlassButton type="button" variant="glass" className="flex-1 justify-center" onClick={() => setDraft(null)}>Cancel</GlassButton>
              <GlassButton type="submit" className="flex-1 justify-center">{draft.isNew ? `Add ${singular}` : 'Save changes'}</GlassButton>
            </div>
          </form>
        )}
      </GlassSheet>

      <GlassSheet open={!!confirm} onClose={() => setConfirm(null)} title="Please confirm" maxWidth="max-w-sm">
        {confirm && (
          <div className="flex flex-col gap-5">
            <p className="text-secondary">{confirm.message}</p>
            <div className="flex gap-2">
              <GlassButton variant="glass" className="flex-1 justify-center" onClick={() => setConfirm(null)}>Cancel</GlassButton>
              <GlassButton variant="danger" className="flex-1 justify-center" onClick={() => { confirm.run(); setConfirm(null) }}>Yes, continue</GlassButton>
            </div>
          </div>
        )}
      </GlassSheet>
    </div>
  )
}
