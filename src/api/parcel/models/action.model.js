import mongoose from 'mongoose'

const collection = 'action-data'

const schema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    description: { type: String, required: true },
    availableArea: {
      unit: { type: String, required: true },
      value: { type: Number, required: true }
    }
  },
  {
    collection,
    timestamps: true
  }
)

schema.index({ code: 1 }, { unique: true })

export default mongoose.model(collection, schema)
