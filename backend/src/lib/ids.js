import crypto from 'node:crypto'

/** Short readable ids (p1abc…, ua…) — same shape the website already uses. */
export const newId = (prefix) => `${prefix}${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`
