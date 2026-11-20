import {
  parcelSupplementsSchema,
  parcelSupplementsSuccessResponseSchema
} from './parcel-supplements.schema.js'

const sbi = '106284736'
const parcelId = 'SX0679-9238'
const baseAction = 'CLIG3'
const plannedActions = [{ actionCode: 'CLIG3', quantity: 2.5, unit: 'ha' }]

describe('parcelSupplementsSchema', () => {
  test('accepts the base action and every action selected on the parcel, in any unit, each supplement with or without its base action', () => {
    const { error } = parcelSupplementsSchema.validate({
      sbi,
      parcelId,
      baseAction,
      plannedActions: [
        ...plannedActions,
        { actionCode: 'AGF1', quantity: 1, unit: 'ha' },
        { actionCode: 'GRH7', quantity: 1, unit: 'ha', baseAction: 'CLIG3' },
        { actionCode: 'GRH8', quantity: 1, unit: 'ha' },
        { actionCode: 'GRH11', quantity: 5000, unit: 'sqm' },
        { actionCode: 'CHRW1', quantity: 120, unit: 'm' }
      ]
    })

    expect(error).toBeUndefined()
  })

  test.each([
    ['without an sbi', { sbi: undefined }],
    ['without a base action', { baseAction: undefined }],
    ['with several base actions', { baseAction: ['CLIG3', 'AGF1'] }],
    [
      'with the base action given with its area',
      { baseAction: plannedActions[0] }
    ],
    ['with the base actions of the old request', { baseActions: ['CLIG3'] }],
    ['without planned actions', { plannedActions: undefined }],
    [
      'with a planned action without a quantity',
      { plannedActions: [{ actionCode: 'CLIG3', unit: 'ha' }] }
    ],
    ['with selected supplements', { selectedSupplements: [] }],
    ['with an invalid parcel id', { parcelId: 'SX0679' }]
  ])('rejects a request %s', (_name, change) => {
    expect(
      parcelSupplementsSchema.validate({
        sbi,
        parcelId,
        baseAction,
        plannedActions,
        ...change
      }).error
    ).toBeDefined()
  })
})

describe('parcelSupplementsSuccessResponseSchema', () => {
  const supplement = {
    code: 'GRH7',
    description: 'Haymaking supplement',
    version: '1.0.0',
    availability: { unit: 'ha', value: 2.5 },
    isAvailable: true,
    quantityRequired: true,
    ratePerUnitGbp: 10
  }

  const response = (supplements) => ({
    message: 'success',
    parcelId: '9238',
    sheetId: 'SX0679',
    baseActionCode: 'CLIG3',
    supplements
  })

  test('accepts available and unavailable supplements', () => {
    const { error } = parcelSupplementsSuccessResponseSchema.validate(
      response([
        supplement,
        {
          ...supplement,
          code: 'GRH8',
          isAvailable: false,
          unavailableReason: {
            code: 'no-availability',
            reason: 'There is no remaining availability for this action',
            metadata: {}
          }
        }
      ])
    )

    expect(error).toBeUndefined()
  })

  test('accepts an empty list of supplements', () => {
    expect(
      parcelSupplementsSuccessResponseSchema.validate(response([])).error
    ).toBeUndefined()
  })

  test('rejects a supplement reporting its own hasSupplements flag', () => {
    expect(
      parcelSupplementsSuccessResponseSchema.validate(
        response([{ ...supplement, hasSupplements: false }])
      ).error
    ).toBeDefined()
  })

  test('rejects a supplement listing base actions', () => {
    expect(
      parcelSupplementsSuccessResponseSchema.validate(
        response([{ ...supplement, baseActionCodes: ['CLIG3'] }])
      ).error
    ).toBeDefined()
  })

  test('rejects base actions given as a list', () => {
    expect(
      parcelSupplementsSuccessResponseSchema.validate({
        ...response([]),
        baseActionCode: ['CLIG3']
      }).error
    ).toBeDefined()
  })
})
