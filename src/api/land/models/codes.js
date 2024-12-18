import mongoose from 'mongoose'

const collection = 'codes'
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    classes: { type: Array, required: true }
  },
  { collection }
)

export default mongoose.model(collection, schema)
