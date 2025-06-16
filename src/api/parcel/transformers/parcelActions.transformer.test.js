import {
  actionTransformer,
  parcelTransformer,
  parcelActionsTransformer,
  sizeTransformer
} from './parcelActions.transformer.js'

describe('sizeTransformer', () => {
  test('should transform area to correct format', () => {
    const area = 1000
    const result = sizeTransformer(area)

    expect(result).toEqual({
      unit: 'ha',
      value: 1000
    })
  })
})

describe('actionTransformer', () => {
  test('should transform action with available area', () => {
    const action = {
      code: 'ACTION1',
      description: 'Test Action',
      guidenceUrl: 'https://www.gov.uk'
    }
    const totalAvailableArea = 500

    const result = actionTransformer(action, totalAvailableArea)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availableArea: {
        unit: 'ha',
        value: 500
      },
      guidenceUrl: 'https://www.gov.uk'
    })
  })

  test('should transform action without available area when totalAvailableArea is null', () => {
    const action = {
      code: 'ACTION1',
      description: 'Test Action',
      guidenceUrl: 'https://www.gov.uk'
    }
    const totalAvailableArea = null

    const result = actionTransformer(action, totalAvailableArea)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availableArea: undefined,
      guidenceUrl: 'https://www.gov.uk'
    })
  })

  test('should transform action without available area when totalAvailableArea is undefined', () => {
    const action = {
      code: 'ACTION1',
      description: 'Test Action',
      guidenceUrl: 'https://www.gov.uk'
    }

    const result = actionTransformer(action)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availableArea: undefined,
      guidenceUrl: 'https://www.gov.uk'
    })
  })

  test('should transform action without available area when totalAvailableArea is 0', () => {
    const action = {
      code: 'ACTION1',
      description: 'Test Action',
      guidenceUrl: 'https://www.gov.uk'
    }
    const totalAvailableArea = 0

    const result = actionTransformer(action, totalAvailableArea)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availableArea: undefined,
      guidenceUrl: 'https://www.gov.uk'
    })
  })
})

describe('parcelTransformer', () => {
  test('should transform land parcel with actions', () => {
    const landParcel = {
      parcel_id: 'P123',
      sheet_id: 'S456',
      area_sqm: 2000
    }
    const actions = [
      {
        code: 'ACTION1',
        description: 'Test Action 1',
        availableArea: {
          unit: 'ha',
          value: 1000
        }
      }
    ]

    const result = parcelTransformer(landParcel, actions)

    expect(result).toEqual({
      parcel: {
        parcelId: 'P123',
        sheetId: 'S456',
        size: {
          unit: 'ha',
          value: 2000
        },
        actions
      }
    })
  })

  test('should handle null parcel_id and sheet_id', () => {
    const landParcel = {
      parcel_id: null,
      sheet_id: null,
      area_sqm: 2000
    }
    const actions = []

    const result = parcelTransformer(landParcel, actions)

    expect(result).toEqual({
      parcel: {
        parcelId: null,
        sheetId: null,
        size: {
          unit: 'ha',
          value: 2000
        },
        actions: []
      }
    })
  })
})

describe('parcelActionsTransformer', () => {
  test('should transform land parcel with actions using spread operator', () => {
    const landParcel = {
      parcel_id: 'P123',
      sheet_id: 'S456',
      area_sqm: 2000
    }
    const actions = [
      {
        code: 'ACTION1',
        description: 'Test Action 1',
        availableArea: {
          unit: 'ha',
          value: 1000
        }
      }
    ]

    const result = parcelActionsTransformer(landParcel, actions)

    expect(result).toEqual({
      parcelId: 'P123',
      sheetId: 'S456',
      size: {
        unit: 'ha',
        value: 2000
      },
      actions
    })
  })

  test('should handle empty actions array', () => {
    const landParcel = {
      parcel_id: 'P123',
      sheet_id: 'S456',
      area_sqm: 2000
    }
    const actions = []

    const result = parcelActionsTransformer(landParcel, actions)

    expect(result).toEqual({
      parcelId: 'P123',
      sheetId: 'S456',
      size: {
        unit: 'ha',
        value: 2000
      },
      actions: []
    })
  })
})
