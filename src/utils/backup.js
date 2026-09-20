// Backup / restore of everything the admin manages. There is no server yet, so this
// JSON file is how content moves between browsers (and how you keep a safe copy).
// Secrets (WhatsApp token, SMTP password) are never written to the file.

const KEYS = [
  're-properties', 're-agents', 're-blog', 're-faqs', 're-testimonials', 're-inquiries',
  're-cities', 're-property-types', 're-top-banner', 're-ticker', 're-company', 're-site-content',
  're-marketing-config', 're-whatsapp-config', 're-mail-config', 're-extra-users', 're-user-overrides',
]

const SECRET_FIELDS = { 're-whatsapp-config': ['accessToken', 'webhookVerifyToken'], 're-mail-config': ['smtpPassword'] }

export function buildBackup() {
  const data = {}
  KEYS.forEach((key) => {
    const raw = localStorage.getItem(key)
    if (raw == null) return
    let value = JSON.parse(raw)
    ;(SECRET_FIELDS[key] ?? []).forEach((f) => { if (value && typeof value === 'object') value = { ...value, [f]: '' } })
    data[key] = value
  })
  return { app: 'ncr-estates', version: 1, exportedAt: new Date().toISOString(), data }
}

export function downloadBackup() {
  const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ncr-estates-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Validates and writes a backup file into localStorage. Returns how many collections were restored. */
export function restoreBackup(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  if (parsed?.app !== 'ncr-estates' || typeof parsed.data !== 'object') throw new Error('This does not look like an NCR Estates backup file.')
  let count = 0
  KEYS.forEach((key) => {
    if (!(key in parsed.data)) return
    let value = parsed.data[key]
    // Keep locally-entered secrets: backups never contain them.
    if (SECRET_FIELDS[key]) {
      const current = JSON.parse(localStorage.getItem(key) ?? '{}')
      SECRET_FIELDS[key].forEach((f) => { value = { ...value, [f]: current[f] ?? '' } })
    }
    localStorage.setItem(key, JSON.stringify(value))
    count++
  })
  return count
}
