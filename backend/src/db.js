import mongoose from 'mongoose'
import { config } from './config.js'

mongoose.set('strictQuery', true)

export async function connectDb(uri = config.mongoUri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 })
  return mongoose.connection
}

export async function disconnectDb() {
  await mongoose.disconnect()
}
