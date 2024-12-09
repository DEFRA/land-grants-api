import {
  mockSarahSingleLandCoverResponses,
  mockSarahSingleLandParcelResponses,
  mockSarahMultiLandCoverResponse,
  mockSarahMultiLandParcelResponse,
  mockMoorlandDataResponse
} from './mockData/index.js'

export const findLandParcel = async (server, landParcelId, sheetId) => {
  if (landParcelId.includes(',')) {
    return mockSarahMultiLandParcelResponse
  }

  return Promise.resolve(
    mockSarahSingleLandParcelResponses.find(
      (item) =>
        item.features[0].properties.PARCEL_ID === landParcelId &&
        item.features[0].properties.SHEET_ID === sheetId
    )
  )
}

export const findLandCover = async (server, landParcelId, sheetId) => {
  if (landParcelId.includes(',')) {
    return mockSarahMultiLandCoverResponse
  }

  return Promise.resolve(
    mockSarahSingleLandCoverResponses.find(
      (item) =>
        item.features[0].properties.PARCEL_ID === landParcelId &&
        item.features[0].properties.SHEET_ID === sheetId
    )
  )
}

export const performUtilityFunction = async () => {
  return Promise.resolve({})
}

export const fetchMoorlandIntersection = async () => {
  return Promise.resolve(mockMoorlandDataResponse)
}
