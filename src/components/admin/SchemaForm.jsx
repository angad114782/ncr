import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import GlassInput from '../glass/GlassInput'
import GlassButton from '../glass/GlassButton'
import Toggle from './Toggle'
import { ImageField, ImageListField } from './ImageField'
import { ICON_NAMES, getIcon } from '../../utils/icons'

// A small schema-driven form so every admin editor (listings, blog, FAQs, site
// content …) is described as data instead of hand-written JSX.
//
// field = { key, label, type, half?, required?, placeholder?, hint?, options?, rows?,
//           fields?, newItem?, addLabel?, render?, showIf? }
// `key` may be a dotted path ("ceo.name"). Types: text · url · number · date · textarea ·
// select · toggle · multiselect · image · imageList · stringList · objectList · icon · custom

export const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)

export function setPath(obj, path, value) {
  const [head, ...rest] = path.split('.')
  if (rest.length === 0) return { ...obj, [head]: value }
  return { ...obj, [head]: setPath(obj?.[head] ?? {}, rest.join('.'), value) }
}

const optionParts = (o) => (typeof o === 'string' ? { value: o, label: o } : o)

function StringListField({ label, value = [], onChange, placeholder, max = 20, addLabel = 'Add', multiline = false }) {
  const update = (i, v) => onChange(value.map((x, idx) => (idx === i ? v : x)))
  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-secondary px-1">{label}</span>}
      <div className="flex flex-col gap-2">
        {value.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex-1 glass-weak rounded-[14px] px-4 flex ${multiline ? 'py-2' : 'h-11 items-center'}`}>
              {multiline ? (
                <textarea rows={3} value={item} onChange={(e) => update(i, e.target.value)} placeholder={placeholder} aria-label={`${label ?? 'Item'} ${i + 1}`} className="bg-transparent outline-none w-full text-[15px] resize-y" />
              ) : (
                <input value={item} onChange={(e) => update(i, e.target.value)} placeholder={placeholder} aria-label={`${label ?? 'Item'} ${i + 1}`} className="bg-transparent outline-none w-full text-[15px]" />
              )}
            </div>
            <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => { const n = [...value]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n) }} className="glass w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-30"><ArrowUp size={14} /></button>
            <button type="button" aria-label="Remove" onClick={() => onChange(value.filter((_, idx) => idx !== i))} className="glass w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-danger)]"><Trash2 size={14} /></button>
          </div>
        ))}
        <div><GlassButton type="button" variant="glass" size="sm" icon={Plus} disabled={value.length >= max} onClick={() => onChange([...value, ''])}>{addLabel}</GlassButton></div>
      </div>
    </div>
  )
}

function MultiSelectField({ label, value = [], onChange, options = [], hint }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-secondary px-1">{label}</span>}
      <div className="flex flex-wrap gap-2">
        {options.map(optionParts).map((o) => (
          <button
            type="button"
            key={o.value}
            aria-pressed={value.includes(o.value)}
            onClick={() => toggle(o.value)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium spring ${value.includes(o.value) ? 'glass-strong text-[var(--color-accent)]' : 'glass-weak text-secondary'}`}
          >
            {o.label}
          </button>
        ))}
        {options.length === 0 && <span className="text-tertiary text-sm">No options yet.</span>}
      </div>
      {hint && <p className="text-tertiary text-xs px-1">{hint}</p>}
    </div>
  )
}

function ObjectListField({ label, value = [], onChange, fields, newItem, addLabel = 'Add item', itemTitle, max = 30 }) {
  const update = (i, next) => onChange(value.map((x, idx) => (idx === i ? next : x)))
  const move = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= value.length) return
    const n = [...value]
    ;[n[i], n[j]] = [n[j], n[i]]
    onChange(n)
  }
  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-sm font-medium text-secondary px-1">{label} <span className="text-tertiary font-normal">({value.length})</span></span>}
      {value.map((item, i) => (
        <div key={i} className="glass-weak rounded-[16px] p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-tertiary truncate">{itemTitle ? itemTitle(item, i) : `${label ?? 'Item'} ${i + 1}`}</p>
            <div className="flex gap-1.5 shrink-0">
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="glass w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30"><ArrowUp size={13} /></button>
              <button type="button" aria-label="Move down" disabled={i === value.length - 1} onClick={() => move(i, 1)} className="glass w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30"><ArrowDown size={13} /></button>
              <button type="button" aria-label="Remove" onClick={() => onChange(value.filter((_, idx) => idx !== i))} className="glass w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-danger)]"><Trash2 size={13} /></button>
            </div>
          </div>
          <SchemaForm schema={fields} value={item} onChange={(next) => update(i, next)} />
        </div>
      ))}
      <div><GlassButton type="button" variant="glass" size="sm" icon={Plus} disabled={value.length >= max} onClick={() => onChange([...value, newItem ? newItem() : {}])}>{addLabel}</GlassButton></div>
    </div>
  )
}

function Field({ field, item, onSet }) {
  const value = getPath(item, field.key)
  const set = (v) => onSet(field.key, v)
  const common = { label: field.label ? `${field.label}${field.required ? ' *' : ''}` : undefined, placeholder: field.placeholder, hint: field.hint }

  switch (field.type) {
    case 'textarea':
      return <GlassInput as="textarea" rows={field.rows ?? 4} {...common} value={value ?? ''} onChange={(e) => set(e.target.value)} />
    case 'number':
      return (
        <GlassInput
          type="number"
          step={field.step ?? 'any'}
          min={field.min}
          {...common}
          value={value ?? ''}
          onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))}
        />
      )
    case 'date':
      return <GlassInput type="date" {...common} value={value ?? ''} onChange={(e) => set(e.target.value)} />
    case 'url':
      return <GlassInput type="url" {...common} value={value ?? ''} onChange={(e) => set(e.target.value)} />
    case 'select':
      return (
        <GlassInput as="select" {...common} value={value ?? ''} onChange={(e) => set(e.target.value)}>
          {field.allowEmpty && <option value="">{field.emptyLabel ?? '— none —'}</option>}
          {(field.options ?? []).map(optionParts).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </GlassInput>
      )
    case 'icon': {
      const Icon = getIcon(value)
      return (
        <div className="flex items-end gap-2">
          <span className="w-12 h-12 rounded-[14px] glass-weak flex items-center justify-center shrink-0 mb-0"><Icon size={18} className="text-[var(--color-accent)]" /></span>
          <GlassInput as="select" className="flex-1" {...common} value={value ?? ''} onChange={(e) => set(e.target.value)}>
            {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
          </GlassInput>
        </div>
      )
    }
    case 'toggle':
      return (
        <div className="glass-weak rounded-[16px] px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{field.label}</p>
            {field.hint && <p className="text-tertiary text-xs">{field.hint}</p>}
          </div>
          <Toggle checked={value !== false && !!value} onChange={set} label={field.label} />
        </div>
      )
    case 'multiselect':
      return <MultiSelectField label={field.label} value={value ?? []} onChange={set} options={field.options} hint={field.hint} />
    case 'image':
      return <ImageField label={field.label} value={value ?? ''} onChange={set} hint={field.hint} />
    case 'imageList':
      return <ImageListField label={field.label} value={value ?? []} onChange={set} hint={field.hint} max={field.max} />
    case 'stringList':
      return <StringListField label={field.label} value={value ?? []} onChange={set} placeholder={field.placeholder} max={field.max} addLabel={field.addLabel} multiline={field.multiline} />
    case 'objectList':
      return <ObjectListField label={field.label} value={value ?? []} onChange={set} fields={field.fields} newItem={field.newItem} addLabel={field.addLabel} itemTitle={field.itemTitle} max={field.max} />
    case 'custom':
      return field.render({ item, value, set, setItem: (next) => onSet(null, next) })
    default:
      return <GlassInput {...common} maxLength={field.maxLength} value={value ?? ''} onChange={(e) => set(e.target.value)} />
  }
}

const FULL_WIDTH = new Set(['textarea', 'image', 'imageList', 'stringList', 'objectList', 'multiselect', 'custom', 'toggle'])

export default function SchemaForm({ schema, value, onChange }) {
  const handleSet = (key, v) => onChange(key === null ? v : setPath(value, key, v))

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {schema
        .filter((f) => !f.showIf || f.showIf(value))
        .map((field, i) => {
          // Long-form controls take the full row; short inputs pair up two per row
          // (override with half: true / half: false).
          const full = (FULL_WIDTH.has(field.type) && field.half !== true) || field.half === false
          return (
            <div key={field.key ?? `custom-${i}`} className={full ? 'sm:col-span-2' : ''}>
              <Field field={field} item={value} onSet={handleSet} />
            </div>
          )
        })}
    </div>
  )
}
