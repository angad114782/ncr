import mongoose from 'mongoose'
import { newId } from './ids.js'

/**
 * Every collection uses short string ids (`p1abc…`) exactly like the website does, and its JSON has
 * `id` (never `_id` / `__v`), so responses match the shapes the front end already reads.
 */
export function makeSchema(definition, { prefix, timestamps = true, ...options } = {}) {
  return new mongoose.Schema(
    { _id: { type: String, default: () => newId(prefix) }, ...definition },
    {
      timestamps,
      versionKey: false,
      toJSON: {
        virtuals: false,
        transform(_doc, ret) {
          ret.id = ret._id
          delete ret._id
          return ret
        },
      },
      ...options,
    },
  )
}

export const model = (name, schema) => mongoose.models[name] ?? mongoose.model(name, schema)
