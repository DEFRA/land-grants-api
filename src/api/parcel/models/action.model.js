import mongoose from 'mongoose'

const collection = 'action-data'

const schema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    description: { type: String, required: true }
  },
  {
    collection,
    timestamps: true
  }
)

schema.index({ code: 1 }, { unique: true })

export default mongoose.model(collection, schema)
