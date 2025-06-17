import mongoose from 'mongoose'

const collection = 'action-data'

const schema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    startDate: { type: String, required: true },
    code: { type: String, required: true },
    description: { type: String, required: true },
    applicationUnitOfMeasurement: { type: String, required: true },
    guidanceUrl: { type: String, required: true },
    payment: {
      ratePerUnitGbp: { type: Number },
      ratePerAgreementPerYearGbp: { type: Number }
    },
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

export default mongoose.models[collection] || mongoose.model(collection, schema)
