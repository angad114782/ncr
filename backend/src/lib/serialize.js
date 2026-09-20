/** Turns a mongoose document / lean object (or a list of them) into the JSON the website reads: `id`, no `_id`. */
export function out(doc) {
  if (Array.isArray(doc)) return doc.map(out)
  if (!doc) return doc
  const obj = typeof doc.toJSON === 'function' ? doc.toJSON() : { ...doc }
  if (obj._id !== undefined) {
    obj.id = obj._id
    delete obj._id
  }
  return obj
}

const drop = (obj, keys) => {
  const o = { ...obj }
  keys.forEach((k) => delete o[k])
  return o
}

/** A listing as visitors see it (no internal review fields). */
export const publicProperty = (p) => drop(out(p), ['submittedBy', 'reviewNote', 'reviewStatus'])

/** An agent as visitors see it (no user link, no status internals). */
export const publicAgent = (a) => drop(out(a), ['userId', 'status', 'joined', 'active', 'createdAt', 'updatedAt'])

export const publicPost = (p) => out(p)

export const paginate = (total, page, limit) => ({ total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) })
