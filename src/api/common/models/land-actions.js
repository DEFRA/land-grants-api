import mongoose from 'mongoose'

const collection = 'landactions'

const actionSchema = new mongoose.Schema({
  code: { type: String, required: true },
  title: { type: String, required: true },
  duration: { type: String, required: true },
  funding: { type: String, required: true },
  landTypes: { type: String, required: true },
  areasOfInterest: { type: String, required: true },
  paymentTypes: { type: String, required: true },
  availableArea: {
    unit: { type: String, required: true },
    value: { type: Number, required: true }
  }
})

const parcelSchema = new mongoose.Schema({
  parcelId: { type: String, required: true },
  sheetId: { type: String, required: true },
  size: {
    unit: { type: String, required: true },
    value: { type: Number, required: true }
  }
})

const schema = new mongoose.Schema(
  {
    parcelId: { type: String, required: true },
    sbi: Number,
    message: { type: String, required: true },
    actions: { type: [actionSchema], required: true },
    parcel: { type: parcelSchema, required: true }
  },
  {
    collection,
    timestamps: true
  }
)

schema.index({ parcelId: 1 }, { unique: true })
schema.index({ sbi: 1 })

export default mongoose.model(collection, schema)
