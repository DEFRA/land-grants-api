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

schema.index({ optionCode: 1, optionCodeCompat: 1, year: 1 }, { unique: true })

export default mongoose.model(collection, schema)
