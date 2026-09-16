import { useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  Download,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import GlassInput from '../../components/glass/GlassInput'
import GlassSheet from '../../components/glass/GlassSheet'
import { useData } from '../../context/DataContext'
import { buildPropertyTemplateCsv, downloadCsv, parsePropertyCsv } from '../../utils/csv'
import propertiesSeed from '../../data/properties.json'

const emptyForm = {
  title: '', type: 'Apartment', purpose: 'Buy', priceLabel: '', price: 0,
  city: '', locality: '', beds: 2, baths: 2, areaSqft: 1000, furnishing: 'Unfurnished',
}

export default function ManageListings() {
  const { properties, addProperty, addProperties, updateProperty, togglePropertyActive, deleteProperty } = useData()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  const openEdit = (property) => {
    setEditingId(property.id)
    setForm(property)
    setSheetOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingId) {
      updateProperty(editingId, form)
    } else {
      addProperty({
        ...form,
        images: ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200'],
        amenities: [],
        agentId: 'a1',
      })
    }
    setSheetOpen(false)
  }

  const handleDownloadTemplate = () => {
    const buySample = propertiesSeed.find((p) => p.id === 'p1')
    const rentSample = propertiesSeed.find((p) => p.id === 'p2')
    const csv = buildPropertyTemplateCsv(buySample, rentSample)
    downloadCsv('property-import-template.csv', csv)
  }

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const { properties: parsed, errors } = parsePropertyCsv(String(reader.result))
      setImportResult({ parsed, errors })
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const confirmImport = () => {
    if (importResult?.parsed?.length) {
      addProperties(importResult.parsed)
    }
    setImportResult(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Manage Listings</h1>
          <p className="text-secondary">{properties.length} properties in the system</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <GlassButton variant="glass" size="sm" icon={Download} onClick={handleDownloadTemplate}>
            Download Template
          </GlassButton>
          <GlassButton variant="glass" size="sm" icon={Upload} onClick={() => fileInputRef.current?.click()}>
            Import CSV
          </GlassButton>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelected}
          />
          <GlassButton icon={Plus} onClick={openAdd}>Add Listing</GlassButton>
        </div>
      </div>

      <GlassCard hover={false} className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-secondary border-b border-[var(--glass-border)]">
                <th className="p-4">Property</th>
                <th className="p-4">City</th>
                <th className="p-4">Purpose</th>
                <th className="p-4">Price</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => (
                <tr key={p.id} className="border-b border-[var(--glass-border)] last:border-0">
                  <td className="p-4 flex items-center gap-3">
                    <img src={p.images[0]} alt="" className="w-12 h-10 rounded-[10px] object-cover" />
                    <span className="font-medium truncate max-w-[180px]">{p.title}</span>
                  </td>
                  <td className="p-4 text-secondary">{p.city}</td>
                  <td className="p-4">
                    <span className="glass-weak px-2.5 py-1 rounded-full text-xs">{p.purpose}</span>
                  </td>
                  <td className="p-4 font-medium">{p.priceLabel}</td>
                  <td className="p-4">
                    <button
                      onClick={() => togglePropertyActive(p.id)}
                      className={`relative w-12 h-7 rounded-full spring shrink-0 ${
                        p.active !== false ? 'bg-[var(--color-success)]' : 'bg-[var(--glass-surface-strong)]'
                      }`}
                      aria-label={p.active !== false ? 'Deactivate listing' : 'Activate listing'}
                    >
                      <span
                        className="absolute top-1 w-5 h-5 rounded-full bg-white shadow spring"
                        style={{ left: p.active !== false ? '26px' : '4px' }}
                      />
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(p)} className="glass w-8 h-8 rounded-full flex items-center justify-center spring hover:scale-105">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteProperty(p.id)} className="glass w-8 h-8 rounded-full flex items-center justify-center spring hover:scale-105 text-[var(--color-danger)]">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={editingId ? 'Edit Listing' : 'Add Listing'} maxWidth="max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <GlassInput label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <GlassInput as="select" label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {['Apartment', 'Villa', 'Studio', 'Commercial', 'Penthouse', 'House'].map((t) => <option key={t}>{t}</option>)}
            </GlassInput>
            <GlassInput as="select" label="Purpose" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}>
              {['Buy', 'Rent'].map((t) => <option key={t}>{t}</option>)}
            </GlassInput>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <GlassInput label="City" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <GlassInput label="Locality" value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} />
          </div>
          <GlassInput label="Price Label (e.g. ₹45,000/mo)" required value={form.priceLabel} onChange={(e) => setForm({ ...form, priceLabel: e.target.value })} />
          <div className="grid grid-cols-3 gap-3">
            <GlassInput label="Beds" type="number" value={form.beds} onChange={(e) => setForm({ ...form, beds: Number(e.target.value) })} />
            <GlassInput label="Baths" type="number" value={form.baths} onChange={(e) => setForm({ ...form, baths: Number(e.target.value) })} />
            <GlassInput label="Sqft" type="number" value={form.areaSqft} onChange={(e) => setForm({ ...form, areaSqft: Number(e.target.value) })} />
          </div>
          <GlassButton type="submit" className="w-full justify-center mt-2">
            {editingId ? 'Save Changes' : 'Add Listing'}
          </GlassButton>
        </form>
      </GlassSheet>

      <GlassSheet open={!!importResult} onClose={() => setImportResult(null)} title="Import Preview" maxWidth="max-w-lg">
        {importResult && (
          <div className="flex flex-col gap-4">
            <div className="glass-weak rounded-[16px] p-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full glass-strong flex items-center justify-center text-[var(--color-success)] shrink-0">
                <Check size={18} />
              </span>
              <div>
                <p className="font-semibold">{importResult.parsed.length} properties ready to import</p>
                <p className="text-secondary text-xs">They'll be added to your listings immediately.</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="glass-weak rounded-[16px] p-4">
                <p className="font-semibold text-sm flex items-center gap-2 mb-2 text-[var(--color-warning)]">
                  <AlertTriangle size={16} /> {importResult.errors.length} row{importResult.errors.length > 1 ? 's' : ''} skipped
                </p>
                <ul className="text-xs text-secondary flex flex-col gap-1 max-h-32 overflow-y-auto">
                  {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}

            {importResult.parsed.length > 0 && (
              <div className="max-h-48 overflow-y-auto flex flex-col gap-2">
                {importResult.parsed.map((p, i) => (
                  <div key={i} className="glass-weak rounded-[12px] px-3 py-2 text-sm flex items-center justify-between">
                    <span className="truncate">{p.title}</span>
                    <span className="text-tertiary text-xs shrink-0 ml-2">{p.city} · {p.purpose}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <GlassButton variant="glass" className="flex-1 justify-center" onClick={() => setImportResult(null)}>
                Cancel
              </GlassButton>
              <GlassButton
                className="flex-1 justify-center"
                disabled={importResult.parsed.length === 0}
                onClick={confirmImport}
              >
                Import {importResult.parsed.length > 0 ? importResult.parsed.length : ''}
              </GlassButton>
            </div>
          </div>
        )}
      </GlassSheet>
    </div>
  )
}
