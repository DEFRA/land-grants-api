import mongoose from 'mongoose'

const collection = 'actions'
const schema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    description: { type: String, required: true },
    uses: { type: Array, required: true },
    payment: {
      amountPerHectare: { type: Number, required: true },
      additionalPaymentPerAgreement: { type: Number }
    },
    eligibilityRules: [
      {
        id: { type: String, required: true }
      }
    ]
  },
  { collection }
)

export default mongoose.model(collection, schema)
