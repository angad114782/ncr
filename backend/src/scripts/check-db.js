import 'dotenv/config'
import mongoose from 'mongoose'

try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  const info = await mongoose.connection.db.admin().ping()
  console.log('MongoDB connected ✔ database:', mongoose.connection.name, JSON.stringify(info))
  const cols = await mongoose.connection.db.listCollections().toArray()
  console.log('collections:', cols.map((c) => c.name).join(', ') || '(none yet)')
} catch (err) {
  console.error('MongoDB connection FAILED:', err.message)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
