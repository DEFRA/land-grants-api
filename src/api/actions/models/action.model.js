import mongoose from 'mongoose'

const collection = 'action-data'

const schema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    startDate: { type: String, required: true },
    code: { type: String, required: true },
    description: { type: String, required: true },
    applicationUnitOfMeasurement: { type: String },
    payment: {
      ratePerUnitGbp: { type: Number },
      ratePerAgreementPerYearGbp: { type: Number }
    },
    landCoverCodes: [{ type: String }],
    landCoverClassCodes: [{ type: String }],
    rules: [
      {
        name: { type: String, required: true },
        config: {
          layerName: { type: String },
          minimumIntersectionPercent: { type: Number },
          tolerancePercent: { type: Number }
        }
      }
    ]
  },
  {
    collection,
    timestamps: true
  }
)

schema.index({ code: 1 }, { unique: true })

export default mongoose.model(collection, schema)
