import { useRef, useState } from 'react'
import { ImagePlus, Link2, Star, Trash2, Upload, X } from 'lucide-react'
import GlassButton from '../glass/GlassButton'
import { dataUrlSizeKb, fileToCompressedDataUrl, isDataUrl, isImageLink } from '../../utils/images'

function Thumb({ src, className = 'w-16 h-16' }) {
  return src ? (
    <img src={src} alt="" className={`${className} rounded-[12px] object-cover bg-[var(--glass-surface-weak)]`} onError={(e) => { e.currentTarget.style.opacity = 0.25 }} />
  ) : (
    <span className={`${className} rounded-[12px] glass-weak flex items-center justify-center text-tertiary`}>
      <ImagePlus size={18} />
    </span>
  )
}

/** Runs uploads through compression and reports friendly errors. */
async function readFiles(files, onError) {
  const out = []
  for (const file of files) {
    try {
      out.push(await fileToCompressedDataUrl(file))
    } catch (e) {
      onError(e.message)
    }
  }
  return out
}

/** One image: choose a file from the device, or paste a link. */
export function ImageField({ label, value, onChange, hint }) {
  const fileRef = useRef(null)
  const [error, setError] = useState('')
  const uploaded = isDataUrl(value)

  const handleFiles = async (e) => {
    setError('')
    const [url] = await readFiles([...e.target.files].slice(0, 1), setError)
    if (url) onChange(url)
    e.target.value = ''
  }

  const handleLink = (v) => {
    setError(v && !isImageLink(v) ? 'Use a link starting with http(s):// or /' : '')
    onChange(v)
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-secondary px-1">{label}</span>}
      <div className="glass-weak rounded-[16px] p-3 flex flex-wrap items-center gap-3">
        <Thumb src={value} className="w-16 h-16 shrink-0" />
        <div className="flex-1 min-w-[200px] flex flex-col gap-2">
          {uploaded ? (
            <p className="text-sm text-secondary">Uploaded image · {dataUrlSizeKb(value)} KB <span className="text-tertiary">(stored in this browser)</span></p>
          ) : (
            <div className="flex items-center gap-2 glass rounded-[12px] px-3 h-10">
              <Link2 size={15} className="text-tertiary shrink-0" />
              <input
                type="url"
                aria-label={`${label ?? 'Image'} link`}
                value={value ?? ''}
                onChange={(e) => handleLink(e.target.value)}
                placeholder="Paste image link (https://…)"
                className="bg-transparent outline-none w-full text-sm"
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <GlassButton type="button" variant="glass" size="sm" icon={Upload} onClick={() => fileRef.current?.click()}>
              Choose from device
            </GlassButton>
            {value && (
              <GlassButton type="button" variant="glass" size="sm" icon={X} onClick={() => { setError(''); onChange('') }}>
                Remove
              </GlassButton>
            )}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" aria-label={`${label ?? 'Image'} upload`} onChange={handleFiles} />
      </div>
      {error && <p className="text-[var(--color-danger)] text-xs px-1">{error}</p>}
      {hint && <p className="text-tertiary text-xs px-1">{hint}</p>}
    </div>
  )
}

/** Several images (gallery): upload multiple files and/or add links; first = cover. */
export function ImageListField({ label, value = [], onChange, hint, max = 12 }) {
  const fileRef = useRef(null)
  const [link, setLink] = useState('')
  const [error, setError] = useState('')

  const addUrls = (urls) => onChange([...value, ...urls].slice(0, max))

  const handleFiles = async (e) => {
    setError('')
    const room = Math.max(0, max - value.length)
    const urls = await readFiles([...e.target.files].slice(0, room), setError)
    if (urls.length) addUrls(urls)
    e.target.value = ''
  }

  const addLink = () => {
    const v = link.trim()
    if (!v) return
    if (!isImageLink(v)) return setError('Use a link starting with http(s):// or /')
    setError('')
    addUrls([v])
    setLink('')
  }

  const makeCover = (i) => onChange([value[i], ...value.filter((_, idx) => idx !== i)])

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-secondary px-1">{label} <span className="text-tertiary font-normal">({value.length}/{max})</span></span>}
      <div className="glass-weak rounded-[16px] p-3 flex flex-col gap-3">
        {value.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {value.map((src, i) => (
              <div key={`${i}-${src.slice(-24)}`} className="relative group">
                <Thumb src={src} className="w-20 h-20" />
                {i === 0 && <span className="absolute bottom-1 left-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-accent)] text-white">Cover</span>}
                {isDataUrl(src) && <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded-full bg-black/55 text-white">upload</span>}
                <div className="absolute -top-2 -right-2 flex gap-1">
                  {i !== 0 && (
                    <button type="button" aria-label="Make cover image" onClick={() => makeCover(i)} className="w-6 h-6 rounded-full glass-strong flex items-center justify-center">
                      <Star size={11} />
                    </button>
                  )}
                  <button type="button" aria-label="Remove image" onClick={() => onChange(value.filter((_, idx) => idx !== i))} className="w-6 h-6 rounded-full bg-[var(--color-danger)] text-white flex items-center justify-center">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <GlassButton type="button" variant="glass" size="sm" icon={Upload} disabled={value.length >= max} onClick={() => fileRef.current?.click()}>
            Choose from device
          </GlassButton>
          <div className="flex-1 min-w-[220px] flex items-center gap-2 glass rounded-full pl-4 pr-1.5 h-10">
            <Link2 size={15} className="text-tertiary shrink-0" />
            <input
              type="url"
              aria-label={`${label ?? 'Images'} — add link`}
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }}
              placeholder="Or paste an image link and press Add"
              className="bg-transparent outline-none w-full text-sm"
            />
            <GlassButton type="button" size="sm" className="!px-4 !py-1.5" disabled={!link.trim() || value.length >= max} onClick={addLink}>Add</GlassButton>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" aria-label={`${label ?? 'Images'} upload`} onChange={handleFiles} />
      </div>
      {error && <p className="text-[var(--color-danger)] text-xs px-1">{error}</p>}
      {hint && <p className="text-tertiary text-xs px-1">{hint}</p>}
    </div>
  )
}
