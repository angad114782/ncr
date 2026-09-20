/** Indian mobile numbers: accepts 98XXXXXXXX, +91 98XXX XXXXX, 0 98XXXXXXXX → "98XXXXXXXX". Returns '' when invalid. */
export function normalizePhone(input) {
  let d = String(input ?? '').replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2)
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  return /^[6-9]\d{9}$/.test(d) ? d : ''
}

export const maskPhone = (p) => (p ? `${'•'.repeat(Math.max(0, String(p).length - 3))}${String(p).slice(-3)}` : '')
