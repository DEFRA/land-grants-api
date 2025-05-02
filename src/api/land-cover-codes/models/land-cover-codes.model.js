import mongoose from 'mongoose'

const collection = 'land-cover-codes'

const schema = new mongoose.Schema(
  {
    landCoverTypeDescription: { type: String, required: true },
    landCoverTypeCode: { type: String, required: true },
    landCoverClassDescription: { type: String, required: true },
    landCoverClassCode: { type: String, required: true },
    landUseClassDescription: { type: String, required: true },
    landUseClassCode: { type: String, required: true },
    landUseDescription: { type: String, required: true },
    landUseCode: { type: String, required: true }
  },
  {
    collection,
    timestamps: true
  }
)

schema.index(
  { landUseCode: 1, landCoverTypeCode: 1, landCoverClassCode: 1 },
  { unique: true }
)

export default mongoose.model(collection, schema)
