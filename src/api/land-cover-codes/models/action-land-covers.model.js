import mongoose from 'mongoose'

const LandCoverSchema = new mongoose.Schema(
  {
    landCoverCode: {
      type: String,
      required: true
    },
    landCoverClassCode: {
      type: String,
      required: true
    }
  },
  { _id: false }
)

const ActionLandCoverSchema = new mongoose.Schema({
  actionCode: {
    type: String,
    required: true,
    unique: true
  },
  landCovers: {
    type: [LandCoverSchema],
    required: true
  }
})

const ActionLandCovers = mongoose.model(
  'action-land-covers',
  ActionLandCoverSchema
)

export default ActionLandCovers
