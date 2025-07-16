import { getEnabledActions } from '~/src/api/actions/queries/getActions.query.js'

import {
  connectToTestDatbase,
  resetDatabase,
  seedPostgres
} from '~/src/db-tests/setup/postgres.js'

const logger = {
  info: jest.fn(),
  error: jest.fn()
}

let connection

describe('Get actions', () => {
  beforeAll(async () => {
    connection = await connectToTestDatbase()
    await seedPostgres(connection, {
      actions: true
    })
  }, 60000)

  afterAll(async () => {
    await resetDatabase(connection)
    await connection.end()
  })

  test('should return all enabled actions', async () => {
    const actions = await getEnabledActions(logger, connection)

    expect(actions.length).toBeGreaterThan(0)
  })

  test('should return CMOR1', async () => {
    const actions = await getEnabledActions(logger, connection)

    // eslint-disable-next-line
    const { last_updated, id, ...cmor1 } = actions.find(
      (a) => a.code === 'CMOR1'
    )

    expect(cmor1).toEqual({
      version: '1',
      enabled: true,
      display: true,
      start_date: new Date('2025-01-01T00:00:00.000Z'),
      code: 'CMOR1',
      description: 'CMOR1: Assess moorland and produce a written record',
      application_unit_of_measurement: 'ha',
      payment: {
        ratePerUnitGbp: 10.6,
        ratePerAgreementPerYearGbp: 272
      },
      land_cover_class_codes: [
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
          config: {
            layerName: 'moorland',
            minimumIntersectionPercent: 50,
            tolerancePercent: 1
          }
        },
        {
          name: 'applied-for-total-available-area'
        }
      ]
    })
  })
})
