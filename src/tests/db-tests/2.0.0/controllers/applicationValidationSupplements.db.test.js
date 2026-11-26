import { ApplicationValidationController } from '~/src/features/application/controllers/2.0.0/application-validation.controller.js'
import { auditEvent } from '~/src/features/common/helpers/audit-event.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'
import { createResponseCapture } from '~/src/tests/db-tests/setup/utils.js'
import {
  clearCompatibilityMatrix,
  seedCompatibilityMatrix
} from '~/src/tests/db-tests/setup/compatibility-matrix.js'
import { getActionsByVersion } from '~/src/features/actions/queries/2.0.0/getActionsByVersion.query.js'
import { getAgreements } from '~/src/services/dal/index.js'
import { logger } from '~/src/tests/db-tests/setup/testLogger.js'

vi.mock('~/src/services/dal/index.js')
vi.mock('~/src/features/common/helpers/audit-event.js')
vi.mock('~/src/features/actions/queries/2.0.0/getActionsByVersion.query.js')
const mockGetActionsByVersion = vi.mocked(getActionsByVersion)
const mockGetAgreements = vi.mocked(getAgreements)
const mockAuditEvent = vi.mocked(auditEvent)

const PARCEL_AREA_RULE = 'applied-for-total-or-partial-available-area'

const enabledAction = (code) => ({
  enabled: true,
  display: true,
  code,
  description: `${code} description`,
  applicationUnitOfMeasurement: 'ha',
  payment: { ratePerUnitGbp: 10 },
  semanticVersion: '1.0.0',
  rules: [{ name: PARCEL_AREA_RULE, description: 'Parcel area' }]
})

// A parcel of 10.0548 ha, all of it permanent grassland (131), which CLIG3_26,
// CAGF1, GRH7_26, GRH8_26 and SPM3_26 can all use
const sheetId = 'SD6154'
const parcelId = '8973'

const ha = (code, quantity) => ({ code, quantity })

describe('Application validation of supplements', () => {
  const compatibilitySource = 'applicationValidationSupplements.db.test'
  let connection

  // Real 2026 rows:
  // - CLIG3_26 is a base for GRH7_26, GRH8_26 and SPM3_26
  // - CLIG3_26 and CAGF1 can share land; CAGF1 has no row with the supplements
  // - GRH7_26 and SPM3_26 can stack (SUPCO); GRH7_26 and GRH8_26 cannot
  // The codes differ from the other DB tests' because the matrix rows are
  // unique: a file that cleared rows another file also seeded would remove
  // them from under it, as the files run in parallel.
  beforeAll(async () => {
    connection = connectToTestDatabase()

    await seedCompatibilityMatrix(
      connection,
      compatibilitySource,
      [
        ['CLIG3_26', 'GRH7_26'],
        ['CLIG3_26', 'GRH8_26'],
        ['CLIG3_26', 'SPM3_26']
      ],
      { type: 'SUPBAS' }
    )
    await seedCompatibilityMatrix(connection, compatibilitySource, [
      ['CLIG3_26', 'CAGF1'],
      ['CAGF1', 'CLIG3_26']
    ])
    await seedCompatibilityMatrix(
      connection,
      compatibilitySource,
      [
        ['GRH7_26', 'SPM3_26'],
        ['SPM3_26', 'GRH7_26']
      ],
      { type: 'SUPCO' }
    )
  })

  afterAll(async () => {
    await clearCompatibilityMatrix(connection, compatibilitySource)
    await connection.end()
  })

  beforeEach(() => {
    mockGetAgreements.mockResolvedValue({})
    mockAuditEvent.mockResolvedValue(undefined)
    mockGetActionsByVersion.mockResolvedValue(
      ['CLIG3_26', 'CAGF1', 'GRH7_26', 'GRH8_26', 'SPM3_26'].map(enabledAction)
    )
  })

  const validate = async (actions) => {
    const { h, getResponse } = createResponseCapture()

    await ApplicationValidationController.handler(
      {
        payload: {
          applicationId: `supplements-${actions.map((a) => a.code).join('-')}`,
          requester: 'local',
          applicationCrn: 'crn',
          landActions: [{ sheetId, parcelId, sbi: '106284736', actions }]
        },
        headers: { 'x-forwarded-authorization': 'defra-id-token' },
        logger,
        server: { postgresDb: connection }
      },
      h
    )

    const { data, statusCode } = getResponse()
    expect(statusCode).toBe(200)
    return data
  }

  // The result of each rule of an action, by rule name
  const rulesOf = (data, code) =>
    Object.fromEntries(
      data.actions
        .find((a) => a.actionCode === code)
        .rules.map((rule) => [rule.name, rule.passed])
    )

  test('passes supplements that cannot stack, side by side within the base action', async () => {
    const data = await validate([
      ha('CLIG3_26', 9),
      ha('GRH7_26', 6),
      ha('GRH8_26', 3)
    ])

    expect(data.valid).toBe(true)
    expect(rulesOf(data, 'GRH7_26')).toEqual({
      [PARCEL_AREA_RULE]: true,
      'supplement-has-base-action': true,
      'supplement-within-base-action-area': true
    })
    expect(rulesOf(data, 'CLIG3_26')).toEqual({ [PARCEL_AREA_RULE]: true })
  })

  test('fails supplements that cannot stack and together exceed the base action', async () => {
    // 6 + 4 ha fits the 10.05 ha parcel, but not the 9 ha of CLIG3_26
    const data = await validate([
      ha('CLIG3_26', 9),
      ha('GRH7_26', 6),
      ha('GRH8_26', 4)
    ])

    expect(data.valid).toBe(false)
    for (const code of ['GRH7_26', 'GRH8_26']) {
      expect(rulesOf(data, code)).toEqual({
        [PARCEL_AREA_RULE]: true,
        'supplement-has-base-action': true,
        'supplement-within-base-action-area': false
      })
    }
  })

  test('passes supplements that can stack on the whole base action', async () => {
    const data = await validate([
      ha('CLIG3_26', 9),
      ha('GRH7_26', 9),
      ha('SPM3_26', 9)
    ])

    expect(data.valid).toBe(true)
  })

  test('fails a supplement over the land another base action leaves it', async () => {
    // CAGF1 can share CLIG3_26's land, but not GRH7_26's: 10.0548 - 4 ha is left
    const data = await validate([
      ha('CLIG3_26', 9),
      ha('CAGF1', 4),
      ha('GRH7_26', 7)
    ])

    expect(data.valid).toBe(false)
    expect(rulesOf(data, 'GRH7_26')).toEqual({
      [PARCEL_AREA_RULE]: false,
      'supplement-has-base-action': true,
      'supplement-within-base-action-area': true
    })
  })

  test('fails a supplement applied for without its base action', async () => {
    const data = await validate([ha('CAGF1', 4), ha('GRH7_26', 4)])

    expect(data.valid).toBe(false)
    expect(rulesOf(data, 'GRH7_26')).toEqual({
      [PARCEL_AREA_RULE]: true,
      'supplement-has-base-action': false
    })
  })
})
