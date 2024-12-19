import mongoose from 'mongoose'

const collection = 'farmers'
const schema = new mongoose.Schema(
  {
    crn: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    landlinePhone: { type: String, required: true },
    mobilePhone: { type: String, required: true },
    businesSize: { type: String, required: true },
    numberOfEmployees: { type: Number, required: true },
    registeredOwner: { type: String, required: true },
    gender: { type: String, required: true },
    address: { type: String, required: true },
    businessType: { type: String, required: true },
    activity: { type: String, required: true },
    businesses: { type: Array, required: true }
  },
  { collection }
)

export default mongoose.model(collection, schema)
