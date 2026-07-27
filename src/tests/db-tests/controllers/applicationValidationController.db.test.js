import { vi } from 'vitest'

import { ApplicationValidationController } from '~/src/features/application/controllers/2.0.0/application-validation.controller.js'
import { auditEvent } from '~/src/features/common/helpers/audit-event.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'
import { createResponseCapture } from '~/src/tests/db-tests/setup/utils.js'
import { getAgreements } from '~/src/services/dal/index.js'
import { getApplicationValidationRun } from '~/src/features/application/queries/getApplicationValidationRun.query.js'

vi.mock('~/src/services/dal/index.js')
vi.mock('~/src/features/common/helpers/audit-event.js')

const mockGetAgreements = getAgreements
const mockAuditEvent = auditEvent

describe('Application Validation Controller', () => {
  let logger, connection

  beforeAll(() => {
    logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    }
    connection = connectToTestDatabase()
  })

  beforeEach(() => {
    mockGetAgreements.mockResolvedValue([])
    mockAuditEvent.mockResolvedValue(undefined)
  })

  afterAll(async () => {
    await connection.end()
  })

  test('should return a 200 status code and save application result', async () => {
    const { h, getResponse } = createResponseCapture()

    await ApplicationValidationController.handler(
      {
        payload: {
          applicationId: '123',
          requester: 'local',
          applicationCrn: 'crn',
          landActions: [
            {
              sheetId: 'SD5649',
              parcelId: '9215',
              sbi: '123456789',
              actions: [
                {
                  code: 'CMOR1',
                  quantity: 1
                },
                {
                  code: 'UPL1',
                  quantity: 1
                }
              ]
            }
          ]
        },
        headers: { 'x-forwarded-authorization': 'dummy' },
        logger,
        server: {
          postgresDb: connection
        }
      },
      h
    )
    const { data, statusCode } = getResponse()
    expect(statusCode).toBe(200)

    const applicationResult = await getApplicationValidationRun(
      logger,
      connection,
      data.id
    )

    expect(data.message).toBe('Application validated successfully')
    expect(data.valid).toBe(false)
    expect(applicationResult).toMatchObject({
      id: data.id,
      application_id: '123'
    })
  })
})
