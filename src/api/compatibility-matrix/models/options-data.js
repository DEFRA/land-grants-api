import mongoose from 'mongoose'

const collection = 'options-data'
const schema = new mongoose.Schema(
  {
    option_code: { type: String, required: true },
    option_code_compatibility: { type: String, required: true },
    type: { type: String, required: true },
    description: { type: String, required: true },
    year: { type: String, required: true }
  },
  { collection }
)

export default mongoose.model(collection, schema)
