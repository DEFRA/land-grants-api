import { getEnabledActions } from '~/src/api/actions/queries/v1/getActions.query.js'
import { connectToTestDatbase } from '~/src/db-tests/setup/postgres.js'
import { vi } from 'vitest'

describe('Get actions', () => {
  let logger, connection

  beforeAll(() => {
    logger = {
      info: vi.fn(),
      error: vi.fn()
    }
    connection = connectToTestDatbase()
  })

  afterAll(async () => {
    await connection.end()
  })

  test('should return all enabled actions', async () => {
    const actions = await getEnabledActions(logger, connection)

    expect(actions.length).toBeGreaterThan(0)
  })

  test('should return CMOR1', async () => {
    const actions = await getEnabledActions(logger, connection)

    // eslint-disable-next-line
    const { lastUpdated, id, ...cmor1 } = actions.find(
      (a) => a.code === 'CMOR1'
    )

    expect(cmor1).toEqual({
      version: 1,
      semanticVersion: '1.0.0',
      enabled: true,
      display: true,
      durationYears: 3,
      startDate: '2025-01-01',
      code: 'CMOR1',
      description: 'Assess moorland and produce a written record',
      applicationUnitOfMeasurement: 'ha',
      payment: {
        ratePerUnitGbp: 10.6,
        ratePerAgreementPerYearGbp: 272
      },
      landCoverClassCodes: [
        '130',
        '240',
        '250',
        '270',
        '280',
        '300',
        '330',
        '580',
        '590',
        '620',
        '640',
        '650'
      ],
      rules: [
        {
          name: 'parcel-has-intersection-with-data-layer',
          description: 'Is this parcel on the moorland?',
          config: {
            layerName: 'moorland',
            minimumIntersectionPercent: 50,
            tolerancePercent: 1
          }
        },
        {
          name: 'applied-for-total-available-area',
          description: 'Has the total available area been applied for?'
        }
      ]
    })
    expect(id).toBeGreaterThan(0)
    expect(lastUpdated).not.toBeNull()
  })

  test('should not return UPL4', async () => {
    const actions = await getEnabledActions(logger, connection)

    // eslint-disable-next-line
    const upl4 = actions.find((a) => a.code === 'UPL4')

    expect(upl4).toBeUndefined()
  })
})
