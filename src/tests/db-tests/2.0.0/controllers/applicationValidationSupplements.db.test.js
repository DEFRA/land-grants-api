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
const HAS_BASE_RULE = 'supplement-has-base-action'

const rule = (name) => ({ name, description: name })

// The supplements are configured with the base action rule, as in grants-config-land-grants
const SUPPLEMENT_RULES = [rule(HAS_BASE_RULE)]

const enabledAction = (code, supplementRules = []) => ({
  enabled: true,
  display: true,
  code,
  description: `${code} description`,
  applicationUnitOfMeasurement: 'ha',
  payment: { ratePerUnitGbp: 10 },
  semanticVersion: '1.0.0',
  rules: [rule(PARCEL_AREA_RULE), ...supplementRules]
})

const supplement = (code) => enabledAction(code, SUPPLEMENT_RULES)

// A parcel of 10.0548 ha, all of it permanent grassland (131), which CLIG3_26,
// CAGF1, GRH7_26 and GRH8_26 can all use
const sheetId = 'SD6154'
const parcelId = '8973'

const ha = (code, quantity) => ({ code, quantity })

describe('Application validation of supplements', () => {
  const compatibilitySource = 'applicationValidationSupplements.db.test'
  let connection

  // Real 2026 rows:
  // - CLIG3_26 is a base for GRH7_26 and GRH8_26
  // - CLIG3_26 and CAGF1 can share land; CAGF1 has no row with the supplements
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
        ['CLIG3_26', 'GRH8_26']
      ],
      { type: 'SUPBAS' }
    )
    await seedCompatibilityMatrix(connection, compatibilitySource, [
      ['CLIG3_26', 'CAGF1'],
      ['CAGF1', 'CLIG3_26']
    ])
  })

  afterAll(async () => {
    await clearCompatibilityMatrix(connection, compatibilitySource)
    await connection.end()
  })

  beforeEach(() => {
    mockGetAgreements.mockResolvedValue({})
    mockAuditEvent.mockResolvedValue(undefined)
    mockGetActionsByVersion.mockResolvedValue([
      enabledAction('CLIG3_26'),
      enabledAction('CAGF1'),
      supplement('GRH7_26'),
      supplement('GRH8_26')
    ])
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

  // The reason of an action's rule
  const reasonOf = (data, code, name) =>
    data.actions
      .find((a) => a.actionCode === code)
      .rules.find((rule) => rule.name === name).reason

  test('makes no supplement checks on an action that is not a supplement', async () => {
    const data = await validate([ha('CLIG3_26', 5), ha('GRH7_26', 5)])

    expect(rulesOf(data, 'CLIG3_26')).toEqual({ [PARCEL_AREA_RULE]: true })
  })

  test('fails a supplement applied for without its base action', async () => {
    const data = await validate([ha('CAGF1', 4), ha('GRH7_26', 4)])

    expect(data.valid).toBe(false)
    // With no base action on the parcel, the supplement has no area either
    expect(rulesOf(data, 'GRH7_26')).toEqual({
      [PARCEL_AREA_RULE]: false,
      [HAS_BASE_RULE]: false
    })
    expect(reasonOf(data, 'GRH7_26', HAS_BASE_RULE)).toBe(
      'GRH7_26 requires the base action CLIG3_26 on the same land parcel'
    )
  })

  test('fails a supplement without its base action, even when its config lacks the base action rule', async () => {
    mockGetActionsByVersion.mockResolvedValue([
      enabledAction('CAGF1'),
      enabledAction('GRH7_26')
    ])

    // CAGF1 is on the parcel, but GRH7_26's base action CLIG3_26 is not
    const data = await validate([ha('CAGF1', 4), ha('GRH7_26', 4)])

    expect(rulesOf(data, 'GRH7_26')).toEqual({ [PARCEL_AREA_RULE]: false })
  })

  test('fails a supplement over the area of its base action', async () => {
    const data = await validate([ha('CLIG3_26', 5), ha('GRH7_26', 5.0001)])

    expect(data.valid).toBe(false)
    expect(rulesOf(data, 'GRH7_26')).toEqual({
      [PARCEL_AREA_RULE]: false,
      [HAS_BASE_RULE]: true
    })
    expect(reasonOf(data, 'GRH7_26', PARCEL_AREA_RULE)).toBe(
      'The amount of land must be the same as or less than the available area'
    )
  })

  test.each(['GRH7_26', 'GRH8_26'])(
    'passes %s on the whole of its base action',
    async (code) => {
      const data = await validate([ha('CLIG3_26', 5), ha(code, 5)])

      expect(data.valid).toBe(true)
      expect(rulesOf(data, code)).toEqual({
        [PARCEL_AREA_RULE]: true,
        [HAS_BASE_RULE]: true
      })
      expect(reasonOf(data, code, PARCEL_AREA_RULE)).toBe(
        'The applied figure (5 ha) is within the allowed range (greater than 0 ha and up to 5 ha)'
      )
    }
  )

  test('passes supplements that can exist side by side within the base action but which cannot stack one upon another', async () => {
    const data = await validate([
      ha('CLIG3_26', 9),
      ha('GRH7_26', 6),
      ha('GRH8_26', 3)
    ])

    expect(data.valid).toBe(true)
  })

  test('fails a supplement that overlaps an action it cannot share land with', async () => {
    // CAGF1 can share CLIG3_26's land, but not GRH7_26's: 10.0548 - 4 ha is left
    // This is in fact a bug, confirmed by Lee Rose. The QAs are happy to have it
    // resolved as part of TODO: https://eaflood.atlassian.net/jira/browse/GSPS-741
    // in order to reduce the complexity of the PR.
    const data = await validate([
      ha('CLIG3_26', 9),
      ha('CAGF1', 4),
      ha('GRH7_26', 7)
    ])

    expect(data.valid).toBe(false)
    expect(rulesOf(data, 'GRH7_26')).toEqual({
      [PARCEL_AREA_RULE]: false,
      [HAS_BASE_RULE]: true
    })
  })
})
