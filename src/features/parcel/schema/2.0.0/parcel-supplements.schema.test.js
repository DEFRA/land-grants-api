import {
  parcelSupplementsSchema,
  parcelSupplementsSuccessResponseSchema
} from './parcel-supplements.schema.js'

const baseAction = { actionCode: 'CLIG3', quantity: 2.5, unit: 'ha' }
const sbi = '106284736'

describe('parcelSupplementsSchema', () => {
  test('defaults the selected supplements to an empty list', () => {
    const { error, value } = parcelSupplementsSchema.validate({
      sbi,
      parcelId: 'SX0679-9238',
      baseAction
    })

    expect(error).toBeUndefined()
    expect(value.selectedSupplements).toEqual([])
  })

  test('accepts selected supplements in hectares or square metres', () => {
    const { error } = parcelSupplementsSchema.validate({
      sbi,
      parcelId: 'SX0679-9238',
      baseAction,
      selectedSupplements: [
        { actionCode: 'GRH7', quantity: 1, unit: 'ha' },
        { actionCode: 'GRH11', quantity: 5000, unit: 'sqm' }
      ]
    })

    expect(error).toBeUndefined()
  })

  test('accepts the other actions selected on the parcel, in any unit', () => {
    const { error } = parcelSupplementsSchema.validate({
      sbi,
      parcelId: 'SX0679-9238',
      baseAction,
      plannedActions: [
        { actionCode: 'CAGF1', quantity: 4, unit: 'ha' },
        { actionCode: 'CHRW1', quantity: 120, unit: 'm' }
      ]
    })

    expect(error).toBeUndefined()
  })

  test('rejects a request without an sbi', () => {
    expect(
      parcelSupplementsSchema.validate({ parcelId: 'SX0679-9238', baseAction })
        .error
    ).toBeDefined()
  })

  test.each([
    ['without a base action', { parcelId: 'SX0679-9238' }],
    [
      'with a base action measured in metres',
      {
        parcelId: 'SX0679-9238',
        baseAction: { ...baseAction, unit: 'm' }
      }
    ],
    [
      'with a negative base action quantity',
      {
        parcelId: 'SX0679-9238',
        baseAction: { ...baseAction, quantity: -1 }
      }
    ],
    [
      'with a selected supplement without a quantity',
      {
        parcelId: 'SX0679-9238',
        baseAction,
        selectedSupplements: [{ actionCode: 'GRH7', unit: 'ha' }]
      }
    ],
    ['with an invalid parcel id', { parcelId: 'SX0679', baseAction }]
  ])('rejects a request %s', (_name, payload) => {
    expect(
      parcelSupplementsSchema.validate({ sbi, ...payload }).error
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
})
