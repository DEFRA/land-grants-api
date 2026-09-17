import { parcelHasValidLandCover } from './parcel-has-valid-land-cover.js'

describe('parcelHasValidLandCover', () => {
  const name = 'parcel-has-valid-land-cover'

  const createApplication = (actionLandCovers, landCovers) => ({
    actionLandCovers,
    landParcel: {
      landCovers
    }
  })

  const createRule = () => ({
    name,
    description: 'Check parcel has valid land cover'
  })

  test('should pass when parcel land covers include all action land covers', () => {
    const result = parcelHasValidLandCover.execute(
      createApplication(
        [{ landCoverClassCode: '110', landCoverCode: '1' }],
        [{ landCoverClassCode: '110', landCoverCode: '1', areaSqm: 100 }]
      ),
      createRule()
    )

    expect(result.passed).toBe(true)
    expect(result.reason).toEqual('Parcel has valid land cover')
  })

  test('should pass when parcel has additional land covers not required by the action', () => {
    const result = parcelHasValidLandCover.execute(
      createApplication(
        [{ landCoverClassCode: '110', landCoverCode: '1' }],
        [
          { landCoverClassCode: '110', landCoverCode: '1', areaSqm: 100 },
          { landCoverClassCode: '130', landCoverCode: '2', areaSqm: 50 }
        ]
      ),
      createRule()
    )

    expect(result.passed).toBe(true)
  })

  test('should fail when parcel does not have a matching land cover code', () => {
    const result = parcelHasValidLandCover.execute(
      createApplication(
        [{ landCoverClassCode: '110', landCoverCode: '1' }],
        [{ landCoverClassCode: '110', landCoverCode: '2', areaSqm: 100 }]
      ),
      createRule()
    )

    expect(result.passed).toBe(false)
    expect(result.reason).toEqual(
      'Parcel does not have valid land covers for this action'
    )
  })

  test('should fail when parcel does not have a matching land cover class code', () => {
    const result = parcelHasValidLandCover.execute(
      createApplication(
        [{ landCoverClassCode: '110', landCoverCode: '1' }],
        [{ landCoverClassCode: '130', landCoverCode: '1', areaSqm: 100 }]
      ),
      createRule()
    )

    expect(result.passed).toBe(false)
  })

  test('should fail when not all action land covers are present on the parcel', () => {
    const result = parcelHasValidLandCover.execute(
      createApplication(
        [
          { landCoverClassCode: '110', landCoverCode: '1' },
          { landCoverClassCode: '130', landCoverCode: '2' }
        ],
        [{ landCoverClassCode: '110', landCoverCode: '1', areaSqm: 100 }]
      ),
      createRule()
    )

    expect(result.passed).toBe(false)
  })

  test('should fail when parcel has no land covers', () => {
    const result = parcelHasValidLandCover.execute(
      createApplication(
        [{ landCoverClassCode: '110', landCoverCode: '1' }],
        []
      ),
      createRule()
    )

    expect(result.passed).toBe(false)
  })

  test('should pass when the action has no required land covers', () => {
    const result = parcelHasValidLandCover.execute(
      createApplication(
        [],
        [{ landCoverClassCode: '110', landCoverCode: '1', areaSqm: 100 }]
      ),
      createRule()
    )

    expect(result.passed).toBe(true)
  })

  test('should fail when the matching land cover has zero area', () => {
    const result = parcelHasValidLandCover.execute(
      createApplication(
        [{ landCoverClassCode: '110', landCoverCode: '1' }],
        [{ landCoverClassCode: '110', landCoverCode: '1', areaSqm: 0 }]
      ),
      createRule()
    )

    expect(result.passed).toBe(false)
    expect(result.reason).toEqual(
      'Parcel does not have valid land covers for this action'
    )
  })

  test('should fail when the matching land cover is missing an area', () => {
    const result = parcelHasValidLandCover.execute(
      createApplication(
        [{ landCoverClassCode: '110', landCoverCode: '1' }],
        [{ landCoverClassCode: '110', landCoverCode: '1' }]
      ),
      createRule()
    )

    expect(result.passed).toBe(false)
  })

  test('should fail when actionLandCovers is not an array', () => {
    const result = parcelHasValidLandCover.execute(
      createApplication(undefined, [
        { landCoverClassCode: '110', landCoverCode: '1' }
      ]),
      createRule()
    )

    expect(result.passed).toBe(false)
    expect(result.reason).toEqual('Rule requires action and parcel land covers')
  })

  test('should fail when landCovers is not an array', () => {
    const result = parcelHasValidLandCover.execute(
      createApplication(
        [{ landCoverClassCode: '110', landCoverCode: '1' }],
        undefined
      ),
      createRule()
    )

    expect(result.passed).toBe(false)
    expect(result.reason).toEqual('Rule requires action and parcel land covers')
  })

  test('should include the name and description in the result', () => {
    const rule = createRule()
    const result = parcelHasValidLandCover.execute(
      createApplication(
        [{ landCoverClassCode: '110', landCoverCode: '1' }],
        [{ landCoverClassCode: '110', landCoverCode: '1', areaSqm: 100 }]
      ),
      rule
    )

    expect(result.name).toEqual(name)
    expect(result.description).toEqual(rule.description)
  })

  test('should include the default explanation', () => {
    const result = parcelHasValidLandCover.execute(
      createApplication(
        [{ landCoverClassCode: '110', landCoverCode: '1' }],
        [{ landCoverClassCode: '110', landCoverCode: '1', areaSqm: 100 }]
      ),
      createRule()
    )

    expect(result.explanations).toEqual([
      {
        title: 'Parcel has valid land cover',
        lines: []
      }
    ])
  })
})
