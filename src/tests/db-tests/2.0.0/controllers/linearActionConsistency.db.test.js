import { randomUUID } from 'node:crypto'
import Boom from '@hapi/boom'
import { ParcelsControllerV2 } from '~/src/features/parcel/controllers/2.0.0/parcels.controller.js'
import { ApplicationValidationController } from '~/src/features/application/controllers/2.0.0/application-validation.controller.js'
import { CaseManagementApplicationValidationRunController } from '~/src/features/case-management-adapter/controllers/case-management-application-validation-run.controller.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'
import { createResponseCapture } from '~/src/tests/db-tests/setup/utils.js'
import { logger } from '~/src/tests/db-tests/setup/testLogger.js'
import { getAgreements } from '~/src/services/dal/index.js'
import { auditEvent } from '~/src/features/common/helpers/audit-event.js'
import { getActionsByLatestVersion } from '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
import { getActionsByVersion } from '~/src/features/actions/queries/2.0.0/getActionsByVersion.query.js'
import { getLandParcelBoundary } from '~/src/features/parcel/queries/getParcelBoundary.query.js'
import { ABOVE_AVAILABLE_LENGTH_REASON } from '~/src/features/rules-engine/rules/1.0.0/applied-for-total-or-partial-available-length/applied-for-total-or-partial-available-length.js'
import {
  SINGLE_SIDE,
  billingFactorOf
} from '~/src/features/common/constants/sidedness.js'

vi.mock('~/src/services/dal/index.js')
vi.mock('~/src/features/common/helpers/audit-event.js')
vi.mock(
  '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
)
vi.mock('~/src/features/actions/queries/2.0.0/getActionsByVersion.query.js')
// The real query, so a test can make the perimeter unreadable for both endpoints
vi.mock(
  '~/src/features/parcel/queries/getParcelBoundary.query.js',
  async (importOriginal) => {
    const original = await importOriginal()
    return { getLandParcelBoundary: vi.fn(original.getLandParcelBoundary) }
  }
)

const mockGetAgreements = vi.mocked(getAgreements)
const mockGetLandParcelBoundary = vi.mocked(getLandParcelBoundary)

describe('Linear actions on /parcels and /validate', () => {
  const sbi = '800000001'
  const sheetId = 'NY8836'
  const parcelId = '6516'
  // ST_Perimeter of the parcel in the seeded extract
  const perimeterMeters = 2389

  const linearAction = (code) => ({
    enabled: true,
    code,
    groupId: 3,
    groupName: 'Boundaries',
    payment: { ratePerUnitGbp: 0.27 },
    applicationUnitOfMeasurement: 'm',
    durationYears: 3,
    startDate: '2025-01-01',
    version: 1,
    display: true,
    description: `Linear action ${code}`,
    semanticVersion: '1.0.0',
    rules: []
  })

  const availableLengthRule = {
    name: 'applied-for-total-or-partial-available-length',
    description: 'Is the applied for length no more than the available length?'
  }

  const bnd1 = {
    ...linearAction('BND1'),
    rules: [
      {
        name: 'minimum-length',
        description: 'Is the applied for length at least 20 m?',
        config: { minimumLengthM: 20 }
      },
      availableLengthRule
    ]
  }
  const bnd2 = linearAction('BND2')

  // Metre agreements reach us from the DAL rather than the agreements table
  const dalAgreement = (actionCode, quantity) => ({
    [`${parcelId}-${sheetId}`]: [
      {
        actionCode,
        quantity,
        unit: 'm',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2030-01-01')
      }
    ]
  })

  // BND2 is single-side, so it is billed for both faces of the boundary it occupies
  const bnd2Occupying = (occupiedMeters) =>
    dalAgreement('BND2', occupiedMeters * billingFactorOf(SINGLE_SIDE))

  const requestParcels = async (plannedActions = [], fields = ['actions']) => {
    const { h, getResponse } = createResponseCapture()

    await ParcelsControllerV2.handler(
      {
        payload: {
          parcelIds: [`${sheetId}-${parcelId}`],
          fields,
          plannedActions
        },
        headers: { 'x-forwarded-authorization': 'dummy' },
        logger,
        server: { postgresDb: connection }
      },
      h
    )

    return getResponse()
  }

  const bnd1On = (parcelsResponse) =>
    parcelsResponse.data.parcels[0].actions.find(({ code }) => code === 'BND1')

  // An error is returned as a Boom rather than through the response toolkit
  const responseFrom = (returned, getResponse) =>
    Boom.isBoom(returned)
      ? { data: null, statusCode: returned.output.statusCode }
      : getResponse()

  const requestValidation = async (actions) => {
    const { h, getResponse } = createResponseCapture()

    const returned = await ApplicationValidationController.handler(
      {
        payload: {
          applicationId: randomUUID(),
          requester: 'local',
          applicantCrn: 'crn',
          sbi,
          landActions: [{ sheetId, parcelId, sbi, actions }]
        },
        headers: { 'x-forwarded-authorization': 'dummy' },
        logger,
        server: { postgresDb: connection }
      },
      h
    )

    return responseFrom(returned, getResponse)
  }

  // What case management shows a caseworker for a saved validation run
  const requestValidationRun = async (id) => {
    const { h, getResponse } = createResponseCapture()

    const returned =
      await CaseManagementApplicationValidationRunController.handler(
        { params: { id }, logger, server: { postgresDb: connection } },
        h
      )

    return responseFrom(returned, getResponse)
  }

  const bnd1RulesIn = (validationResponse) =>
    validationResponse.data.actions.find(
      ({ actionCode }) => actionCode === 'BND1'
    ).rules

  const summaryOf = (component) => component.summaryItems?.[0].text

  const paragraphsOf = (explanations) =>
    explanations
      .flatMap(({ title, content }) => [title, ...content])
      .map((text) => ({ component: 'paragraph', text }))

  // The validation run knows what was applied for, which /parcels cannot
  const withLengthAppliedFor = (explanations, appliedForMeters) =>
    explanations.map((section) =>
      section.title === 'Application'
        ? {
            ...section,
            content: [
              ...section.content,
              `Length applied for: ${appliedForMeters} m`
            ]
          }
        : section
    )

  const availableLengthResultIn = (validationResponse) =>
    bnd1RulesIn(validationResponse).find(
      ({ name }) => name === availableLengthRule.name
    )

  let connection

  beforeAll(() => {
    connection = connectToTestDatabase()
  })

  afterAll(async () => {
    await connection.end()
  })

  beforeEach(() => {
    mockGetAgreements.mockResolvedValue({})
    vi.mocked(auditEvent).mockResolvedValue(undefined)
    vi.mocked(getActionsByLatestVersion).mockResolvedValue([bnd1])
    vi.mocked(getActionsByVersion).mockResolvedValue([bnd1, bnd2])
  })

  afterEach(() => {
    mockGetLandParcelBoundary.mockReset()
  })

  describe('with an existing agreement on the boundary', () => {
    beforeEach(() => {
      mockGetAgreements.mockResolvedValue(dalAgreement('BND2', 300))
    })

    test('should accept the available length /parcels offers', async () => {
      const offered = bnd1On(await requestParcels()).availability.value

      const validation = await requestValidation([
        { code: 'BND1', quantity: offered }
      ])

      expect(availableLengthResultIn(validation).passed).toBe(true)
    })

    test('should reject one metre more than /parcels offers', async () => {
      const offered = bnd1On(await requestParcels()).availability.value

      const validation = await requestValidation([
        { code: 'BND1', quantity: offered + 1 }
      ])

      expect(availableLengthResultIn(validation)).toEqual(
        expect.objectContaining({
          passed: false,
          reason: ABOVE_AVAILABLE_LENGTH_REASON
        })
      )
    })
  })

  describe('with an incompatible sibling action in the application', () => {
    const sibling = { code: 'BND2', quantity: 300 }
    const plannedSibling = { actionCode: 'BND2', quantity: 300, unit: 'm' }

    test('should accept the available length /parcels offers', async () => {
      const offered = bnd1On(await requestParcels([plannedSibling]))
        .availability.value

      const validation = await requestValidation([
        { code: 'BND1', quantity: offered },
        sibling
      ])

      expect(availableLengthResultIn(validation).passed).toBe(true)
    })

    test('should reject one metre more than /parcels offers', async () => {
      const offered = bnd1On(await requestParcels([plannedSibling]))
        .availability.value

      const validation = await requestValidation([
        { code: 'BND1', quantity: offered + 1 },
        sibling
      ])

      expect(availableLengthResultIn(validation).passed).toBe(false)
    })
  })

  test('should report existing actions that do not fit the same way on both', async () => {
    mockGetAgreements.mockResolvedValue(bnd2Occupying(perimeterMeters + 1))

    const { code, reason } = bnd1On(await requestParcels()).unavailableReason
    const validation = await requestValidation([{ code: 'BND1', quantity: 50 }])

    expect(bnd1RulesIn(validation)).toEqual([
      expect.objectContaining({ name: code, passed: false, reason })
    ])
  })

  test('should let a caseworker view the validation run when existing actions do not fit', async () => {
    mockGetAgreements.mockResolvedValue(bnd2Occupying(perimeterMeters + 1))
    const validation = await requestValidation([{ code: 'BND1', quantity: 50 }])

    const validationRun = await requestValidationRun(validation.data.id)

    expect(validationRun.statusCode).toBe(200)
  })

  test('should show a caseworker the available length explanation /parcels gives, with the length applied for', async () => {
    mockGetAgreements.mockResolvedValue(dalAgreement('BND2', 300))
    const parcelsResponse = await requestParcels(
      [],
      ['actions', 'actions.results']
    )
    const { explanations } = bnd1On(parcelsResponse).results
    const validation = await requestValidation([{ code: 'BND1', quantity: 50 }])
    const expectedExplanations = withLengthAppliedFor(explanations, 50)

    const validationRun = await requestValidationRun(validation.data.id)

    const bnd1Details = validationRun.data.response.find(
      (component) => summaryOf(component) === 'BND1'
    )
    const lengthPanel = bnd1Details.items.find(
      (component) =>
        summaryOf(component) === 'Available length calculation explanation'
    )

    expect(lengthPanel.items).toEqual(paragraphsOf(expectedExplanations))
  })

  test('should leave the action available on /parcels but fail /validate when the perimeter cannot be read', async () => {
    mockGetAgreements.mockResolvedValue(dalAgreement('BND2', 300))
    mockGetLandParcelBoundary.mockResolvedValue(null)

    const parcelsAction = bnd1On(await requestParcels())
    const validation = await requestValidation([{ code: 'BND1', quantity: 50 }])

    expect({
      isAvailable: parcelsAction.isAvailable,
      availableLength: parcelsAction.availability.value,
      validationStatus: validation.statusCode
    }).toEqual({
      isAvailable: true,
      availableLength: null,
      validationStatus: 500
    })
  })
})
