// Image helpers for the admin "upload or paste a link" pickers.
//
// Uploads are downscaled and re-encoded in the browser and stored as data URLs
// inside localStorage (there is no server yet). Keep them small — links are
// always the better choice for production and are the only thing CSV carries.

export const isDataUrl = (s) => typeof s === 'string' && s.startsWith('data:')

/** http(s) link or a site-relative path (e.g. /photos/a.jpg). */
export const isImageLink = (s) => typeof s === 'string' && (/^https?:\/\/\S+$/i.test(s.trim()) || /^\/[^\s]+$/.test(s.trim()))

export function dataUrlSizeKb(dataUrl) {
  return Math.round((dataUrl.length * 0.75) / 1024)
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('That file is not a valid image.'))
    img.src = src
  })
}

/**
 * Resize (max width) + compress an uploaded image to a JPEG data URL.
 * SVG / GIF are kept as-is when small, since canvas would flatten them.
 */
export async function fileToCompressedDataUrl(file, { maxWidth = 1000, quality = 0.72 } = {}) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  if (file.size > 12 * 1024 * 1024) throw new Error('Image is larger than 12 MB — pick a smaller one or use a link.')

  const raw = await readAsDataUrl(file)
  if (/image\/(svg\+xml|gif)/.test(file.type)) {
    if (file.size > 200 * 1024) throw new Error('SVG/GIF over 200 KB — use a link instead.')
    return raw
  }

  const img = await loadImage(raw)
  const scale = Math.min(1, maxWidth / img.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff' // JPEG has no alpha — avoid black backgrounds on PNGs
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}
