import { connectToTestDatbase } from '~/src/db-tests/setup/postgres.js'
import { createResponseCapture } from '~/src/db-tests/setup/utils.js'
import { ApplicationValidationController } from '~/src/api/application/controllers/application-validation.controller.js'
import { getApplicationValidationRun } from '~/src/api/application/queries/getApplicationValidationRun.query.js'
import { vi } from 'vitest'

describe('Application Validation Controller', () => {
  let logger, connection

  beforeAll(() => {
    logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    }
    connection = connectToTestDatbase()
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
              sheetId: 'SD6743',
              parcelId: '3385',
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
        logger,
        server: {
          postgresDb: connection
        }
      },
      h
    )
    const { data, statusCode } = getResponse()
    const applicationResult = await getApplicationValidationRun(
      logger,
      connection,
      data.id
    )

    expect(statusCode).toBe(200)
    expect(data.message).toBe('Application validated successfully')
    expect(data.valid).toBe(false)
    expect(applicationResult).toMatchObject({
      id: data.id,
      application_id: '123'
    })
  })
})
