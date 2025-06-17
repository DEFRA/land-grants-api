import { applicationUnitOfMeasurement } from '~/src/api/common/helpers/measurement.js'

const mockParcel = {
  sheet_id: 'SX0679',
  parcel_id: '9238',
  area_sqm: 300,
  features: [],
  landCovers: [
    {
      code: 'Arable',
      area: '300'
    }
  ],
  intersections: {
    sssi: {
      percent: 30,
      name: 'SSSI - Special Site of Scientific Interest'
    },
    moorland: {
      percent: 4,
      name: 'Moorland'
    }
  }
}

const mockParcelWithActions = {
  parcel: {
    parcelId: '9238',
    sheetId: 'SX0679',
    size: {
      unit: applicationUnitOfMeasurement,
      value: applicationUnitOfMeasurement === 'sqm' ? 300 : 0.03
    },
    actions: [
      {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        guidanceUrl: 'https://www.gov.uk/guidance/cmor1',
        availableArea: {
          unit: applicationUnitOfMeasurement,
          value: applicationUnitOfMeasurement === 'sqm' ? 200 : 0.02
        }
      }
    ]
  }
}

export { mockParcel, mockParcelWithActions }
