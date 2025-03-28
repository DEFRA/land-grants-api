import mongoose from 'mongoose'

const collection = 'landactions'

const actionSchema = new mongoose.Schema({
  code: { type: String, required: true },
  description: { type: String, required: true },
  durationYears: { type: Number, required: true },
  payment: {
    type: { type: String, required: true },
    value: { type: Number, required: true },
    unit: { type: String, required: true },
    additionalPaymentPerAgreement: { type: Number, required: true }
  },
  validLandCovers: { type: [String], required: true },
  eligibilityRules: [{ id: { type: String, required: true } }]
})

const schema = new mongoose.Schema(
  {
    sheetId: { type: String, required: true },
    parcelId: { type: String, required: true },
    sbi: { type: String, required: true },
    actions: { type: [actionSchema], required: true }
  },
  {
    collection,
    timestamps: true
  }
)

schema.index({ parcelId: 1, sheetId: 1 }, { unique: true })
schema.index({ sbi: 1 })

export default mongoose.model(collection, schema)
