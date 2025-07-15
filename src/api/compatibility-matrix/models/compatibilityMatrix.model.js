import mongoose from 'mongoose'

const collection = 'compatibility-matrix'

const schema = new mongoose.Schema(
  {
    optionCode: { type: String, required: true },
    optionCodeCompat: { type: String, required: true },
    year: { type: String, required: true }
  },
  {
    collection,
    timestamps: true
  }
)

export default mongoose.model(collection, schema)
