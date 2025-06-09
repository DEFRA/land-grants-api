export const mergelLandCoverCodes = (action) => {
  return Array.from(
    new Set(action.landCoverClassCodes.concat(action.landCoverCodes))
  )
}
