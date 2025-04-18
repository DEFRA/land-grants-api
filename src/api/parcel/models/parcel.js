import mongoose from 'mongoose'

const collection = 'parcel-data'

const landCoverSchema = new mongoose.Schema({
  code: { type: String, required: true },
  area: { type: String, required: true }
})

const schema = new mongoose.Schema(
  {
    sheetId: { type: String, required: true },
    parcelId: { type: String, required: true },
    area: { type: Number, required: true },
    features: { type: Array, required: false },
    landCovers: { type: [landCoverSchema], required: false },
    intersections: {
      sssi: {
        percent: { type: Number, required: false },
        name: { type: String, required: false }
      },
      moorland: {
        percent: { type: Number, required: false },
        name: { type: String, required: false }
      }
    }
  },
  {
    collection,
    timestamps: true
  }
)

schema.index({ parcelId: 1, sheetId: 1 }, { unique: true })

export default mongoose.model(collection, schema)
