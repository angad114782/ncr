import { useRef, useState } from 'react'
import { AlertTriangle, Check, Download, FileSpreadsheet, Upload } from 'lucide-react'
import GlassButton from '../glass/GlassButton'
import GlassSheet from '../glass/GlassSheet'
import { downloadCsv } from '../../utils/csv'

/**
 * Template / Export / Import buttons for any collection.
 * config = { entity, filename, keyHelp, toCsv(items) → {csv, skipped}, template(seedItems), parse(text, existing) → {items, errors} }
 * Import shows a review (new vs updated, skipped rows with reasons) before anything changes.
 */
export default function CsvToolbar({ config, items, seedItems = [], onImport, itemLabel = (x) => x.title ?? x.question ?? x.name ?? x.id }) {
  const fileRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [notice, setNotice] = useState('')

  const handleTemplate = () => downloadCsv(`${config.filename}-template.csv`, config.template(seedItems))

  const handleExport = () => {
    const { csv, skipped } = config.toCsv(items)
    downloadCsv(`${config.filename}-${new Date().toISOString().slice(0, 10)}.csv`, csv)
    setNotice(
      skipped > 0
        ? `Exported ${items.length} ${config.entity}. ${skipped} uploaded image${skipped > 1 ? 's were' : ' was'} left blank — CSV carries image links only.`
        : `Exported ${items.length} ${config.entity}.`,
    )
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = config.parse(String(reader.result), items)
      const existing = new Set(items.map((x) => x.id))
      setPreview({ ...result, updates: result.items.filter((x) => existing.has(x.id)).length })
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const confirmImport = async () => {
    const importing = preview.items.length
    const summary = onImport(preview.items)
    setPreview(null)
    // In API mode this doesn't actually land until the server confirms it — a CSV with even one bad row is
    // refused as a whole batch (no partial import), so "Imported" must mean the server said so, not just that
    // the on-screen table updated optimistically (see docs/rules.md — the whole point of this fix).
    if (summary?.ready) {
      setNotice(`Importing ${importing} ${config.entity}…`)
      try {
        await summary.ready
        setNotice(`Imported ${importing} ${config.entity} — ${summary.added} new, ${summary.updated} updated.`)
      } catch (err) {
        setNotice(`Import failed — nothing was saved: ${err.message}`)
      }
    } else {
      setNotice(`Imported ${importing} ${config.entity}${summary ? ` — ${summary.added} new, ${summary.updated} updated` : ''}.`)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center gap-2 justify-end">
        <GlassButton variant="glass" size="sm" icon={FileSpreadsheet} onClick={handleTemplate}>Template</GlassButton>
        <GlassButton variant="glass" size="sm" icon={Download} onClick={handleExport} disabled={items.length === 0}>Export CSV</GlassButton>
        <GlassButton variant="glass" size="sm" icon={Upload} onClick={() => fileRef.current?.click()}>Import CSV</GlassButton>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" aria-label={`Import ${config.entity} CSV`} onChange={handleFile} />
      </div>
      {notice && <p role="status" className="text-xs text-secondary max-w-md text-right">{notice}</p>}

      <GlassSheet open={!!preview} onClose={() => setPreview(null)} title={`Import ${config.entity}`} maxWidth="max-w-lg">
        {preview && (
          <div className="flex flex-col gap-4">
            <div className="glass-weak rounded-[16px] p-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full glass-strong flex items-center justify-center text-[var(--color-success)] shrink-0"><Check size={18} /></span>
              <div>
                <p className="font-semibold">{preview.items.length} {config.entity} ready — {preview.items.length - preview.updates} new, {preview.updates} to update</p>
                <p className="text-secondary text-xs">{config.keyHelp}</p>
              </div>
            </div>

            {preview.errors.length > 0 && (
              <div className="glass-weak rounded-[16px] p-4">
                <p className="font-semibold text-sm flex items-center gap-2 mb-2 text-[var(--color-warning)]">
                  <AlertTriangle size={16} /> {preview.errors.length} problem{preview.errors.length > 1 ? 's' : ''} found
                </p>
                <ul className="text-xs text-secondary flex flex-col gap-1 max-h-32 overflow-y-auto">
                  {preview.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}

            {preview.items.length > 0 && (
              <div className="max-h-48 overflow-y-auto flex flex-col gap-2">
                {preview.items.map((p, i) => (
                  <div key={i} className="glass-weak rounded-[12px] px-3 py-2 text-sm truncate">{itemLabel(p)}</div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <GlassButton variant="glass" className="flex-1 justify-center" onClick={() => setPreview(null)}>Cancel</GlassButton>
              <GlassButton className="flex-1 justify-center" disabled={preview.items.length === 0} onClick={confirmImport}>
                Import {preview.items.length || ''}
              </GlassButton>
            </div>
          </div>
        )}
      </GlassSheet>
    </div>
  )
}
