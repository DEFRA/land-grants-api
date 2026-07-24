import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const mockConfigGet = vi.hoisted(() =>
  vi.fn((key) => {
    const configMap = {
      cdpEnvironment: 'test',
      serviceName: 'land-grants-api',
      'aws.region': 'eu-west-2',
      'sns.endpoint': 'http://localhost:4566',
      'sns.auditTopicArn':
        'arn:aws:sns:eu-west-2:000000000000:fcp_audit_land_grants_api',
      'tracing.header': 'x-cdp-request-id'
    }
    return configMap[key]
  })
)

const mockExtractIp = vi.hoisted(() => vi.fn())

vi.mock('~/src/config/index.js', () => ({ config: { get: mockConfigGet } }))

vi.mock('~/src/features/common/helpers/request-ip.js', () => ({
  extractIp: mockExtractIp
}))

describe('AuditEvent', () => {
  let AuditEvent

  beforeEach(async () => {
    vi.resetModules()
    vi.doMock('@aws-sdk/client-sns', () => ({
      SNSClient: vi.fn().mockImplementation(function () {
        this.send = vi.fn().mockResolvedValue({})
      }),
      PublishCommand: vi.fn().mockImplementation(function (input) {
        this.input = input
      })
    }))
    vi.doMock('~/src/features/common/helpers/logging/logger.js', () => ({
      createLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn() }))
    }))
    ;({ AuditEvent } = await import('./audit-event.js'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('is frozen', () => {
    expect(Object.isFrozen(AuditEvent)).toBe(true)
  })

  test('contains expected event keys', () => {
    expect(AuditEvent.SFI_PAYMENT_CALCULATED).toBe('SFI_PAYMENT_CALCULATED')
    expect(AuditEvent.SFI_APPLICATION_VALIDATED).toBe(
      'SFI_APPLICATION_VALIDATED'
    )
    expect(AuditEvent.WMP_PAYMENT_CALCULATED).toBe('WMP_PAYMENT_CALCULATED')
    expect(AuditEvent.WMP_VALIDATED).toBe('WMP_VALIDATED')
  })

  test('cannot be mutated', () => {
    expect(() => {
      AuditEvent.NEW_KEY = 'value'
    }).toThrow(TypeError)
    expect(AuditEvent.NEW_KEY).toBeUndefined()
  })
})

describe('auditEvent', () => {
  let auditEvent
  let mockSend
  let mockLogger
  let SNSClient
  let PublishCommand

  const UNMAPPED_EVENT = 'SOME_EVENT_NOT_YET_WIRED_UP'

  beforeEach(async () => {
    vi.resetModules()
    mockSend = vi.fn().mockResolvedValue({})
    mockLogger = { info: vi.fn(), warn: vi.fn() }
    mockExtractIp.mockReturnValue('192.168.1.100')
    vi.doMock('@aws-sdk/client-sns', () => ({
      SNSClient: vi.fn().mockImplementation(function () {
        this.send = mockSend
      }),
      PublishCommand: vi.fn().mockImplementation(function (input) {
        this.input = input
      })
    }))
    vi.doMock('~/src/features/common/helpers/logging/logger.js', () => ({
      createLogger: vi.fn(() => mockLogger)
    }))
    ;({ auditEvent } = await import('./audit-event.js'))
    ;({ SNSClient, PublishCommand } = await import('@aws-sdk/client-sns'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  const getPublishedPayload = () => {
    const [publishCommandInstance] = mockSend.mock.calls[0]
    return JSON.parse(publishCommandInstance.input.Message)
  }

  test('creates SNSClient with correct region and endpoint', async () => {
    await auditEvent(UNMAPPED_EVENT, {})

    expect(SNSClient).toHaveBeenCalledWith({
      region: 'eu-west-2',
      endpoint: 'http://localhost:4566'
    })
  })

  test('publishes to the correct topic ARN', async () => {
    await auditEvent(UNMAPPED_EVENT, {})

    expect(PublishCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        TopicArn: 'arn:aws:sns:eu-west-2:000000000000:fcp_audit_land_grants_api'
      })
    )
  })

  test('publishes correct top-level fields', async () => {
    const context = {
      correlationId: 'corr-xyz',
      sessionId: 'session-abc',
      user: 'test.user@defra.gov.uk'
    }

    await auditEvent(UNMAPPED_EVENT, context)

    expect(getPublishedPayload()).toMatchObject({
      sessionid: 'session-abc',
      user: 'test.user@defra.gov.uk',
      correlationid: 'corr-xyz',
      datetime: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      environment: 'cdp-test',
      application: 'Grants',
      component: 'land-grants-api'
    })
  })

  test('sessionid and user are undefined when absent from context', async () => {
    await auditEvent(UNMAPPED_EVENT, { correlationId: 'corr-xyz' })

    const payload = getPublishedPayload()
    expect(payload.sessionid).toBeUndefined()
    expect(payload.user).toBeUndefined()
  })

  test('omits the security block entirely for an event with no pmc code', async () => {
    await auditEvent(UNMAPPED_EVENT, {})

    expect(getPublishedPayload().security).toBeUndefined()
  })

  test('publishes correct audit fields', async () => {
    const context = {
      correlationId: 'corr-xyz',
      identifiers: { sbi: 123456789, frn: 1234567890, crn: 'CRN-001' }
    }

    await auditEvent(UNMAPPED_EVENT, context)

    const { audit } = getPublishedPayload()

    expect(audit.eventtype).toBeUndefined()
    expect(audit).toMatchObject({
      entities: [],
      status: 'success',
      details: context,
      accounts: { sbi: 123456789, frn: 1234567890, crn: 'CRN-001' }
    })
  })

  test('audit.accounts populates only known fields', async () => {
    await auditEvent(UNMAPPED_EVENT, {
      identifiers: { sbi: 111111111 }
    })

    expect(getPublishedPayload().audit.accounts).toEqual({
      sbi: 111111111,
      frn: undefined,
      crn: undefined
    })
  })

  test('ip is populated from extractIp(request)', async () => {
    mockExtractIp.mockReturnValue('10.0.0.5')
    const mockRequest = { headers: { 'x-forwarded-for': '10.0.0.5' } }

    await auditEvent(UNMAPPED_EVENT, {}, 'success', mockRequest)

    expect(mockExtractIp).toHaveBeenCalledWith(mockRequest)
    expect(getPublishedPayload().ip).toBe('10.0.0.5')
  })

  test('ip is populated from extractIp(null) when no request is available', async () => {
    await auditEvent(UNMAPPED_EVENT, {})

    expect(mockExtractIp).toHaveBeenCalledWith(null)
    expect(getPublishedPayload().ip).toBe('192.168.1.100')
  })

  test('passes failure status through to the published payload', async () => {
    await auditEvent(UNMAPPED_EVENT, {}, 'failure')

    expect(getPublishedPayload().audit.status).toBe('failure')
  })

  test('handles empty context gracefully', async () => {
    await auditEvent(UNMAPPED_EVENT)

    const payload = getPublishedPayload()
    expect(payload.correlationid).toBeUndefined()
    expect(payload.audit.entities).toEqual([])
  })

  test('defaults status to success when not provided', async () => {
    await auditEvent(UNMAPPED_EVENT, {})

    expect(getPublishedPayload().audit.status).toBe('success')
  })

  test('message is valid JSON', async () => {
    await auditEvent(UNMAPPED_EVENT, {})

    const [publishCommandInstance] = mockSend.mock.calls[0]
    expect(() => JSON.parse(publishCommandInstance.input.Message)).not.toThrow()
  })

  test('logs info when the audit event is successfully published', async () => {
    const context = { correlationId: 'corr-xyz' }

    await auditEvent(UNMAPPED_EVENT, context)

    expect(mockLogger.info).toHaveBeenCalledWith(
      `Audit event successfully published: ${UNMAPPED_EVENT} ${JSON.stringify(context)}`
    )
  })
})

describe('auditEvent - SFI_PAYMENT_CALCULATED', () => {
  let auditEvent
  let AuditEvent
  let mockSend

  beforeEach(async () => {
    vi.resetModules()
    mockSend = vi.fn().mockResolvedValue({})
    mockExtractIp.mockReturnValue('192.168.1.100')
    vi.doMock('@aws-sdk/client-sns', () => ({
      SNSClient: vi.fn().mockImplementation(function () {
        this.send = mockSend
      }),
      PublishCommand: vi.fn().mockImplementation(function (input) {
        this.input = input
      })
    }))
    vi.doMock('~/src/features/common/helpers/logging/logger.js', () => ({
      createLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn() }))
    }))
    ;({ auditEvent, AuditEvent } = await import('./audit-event.js'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  const getPublishedPayload = () => {
    const [publishCommandInstance] = mockSend.mock.calls[0]
    return JSON.parse(publishCommandInstance.input.Message)
  }

  test('does not include a security block', async () => {
    await auditEvent(AuditEvent.SFI_PAYMENT_CALCULATED, {
      applicationId: 'app-1'
    })

    expect(getPublishedPayload().security).toBeUndefined()
  })

  test('publishes correct audit fields, including all payment calculation details', async () => {
    const context = {
      correlationId: 'corr-xyz',
      applicationId: 'app-1',
      identifiers: { sbi: 123456789 },
      request: { parcel: [{ sheetId: 'SD2324', parcelId: '1253' }] },
      response: { annualTotalPence: 100000, agreementTotalPence: 300000 }
    }

    await auditEvent(AuditEvent.SFI_PAYMENT_CALCULATED, context)

    const payload = getPublishedPayload()
    expect(payload.audit).toMatchObject({
      eventtype: 'GrantsPaymentCalculated',
      entities: [{ entity: 'payment', action: 'read', entityid: 'app-1' }],
      status: 'success',
      details: context,
      accounts: { sbi: 123456789 }
    })
  })

  test('is traceable to a named user and session when provided', async () => {
    const context = {
      applicationId: 'app-1',
      user: 'test.user@defra.gov.uk',
      sessionId: 'session-abc'
    }

    await auditEvent(AuditEvent.SFI_PAYMENT_CALCULATED, context)

    expect(getPublishedPayload()).toMatchObject({
      user: 'test.user@defra.gov.uk',
      sessionid: 'session-abc'
    })
  })

  test('user and sessionid are omitted when not provided', async () => {
    await auditEvent(AuditEvent.SFI_PAYMENT_CALCULATED, {
      applicationId: 'app-1'
    })

    const payload = getPublishedPayload()
    expect(payload.user).toBeUndefined()
    expect(payload.sessionid).toBeUndefined()
  })
})

describe('auditEvent - SFI_APPLICATION_VALIDATED', () => {
  let auditEvent
  let AuditEvent
  let mockSend

  beforeEach(async () => {
    vi.resetModules()
    mockSend = vi.fn().mockResolvedValue({})
    mockExtractIp.mockReturnValue('192.168.1.100')
    vi.doMock('@aws-sdk/client-sns', () => ({
      SNSClient: vi.fn().mockImplementation(function () {
        this.send = mockSend
      }),
      PublishCommand: vi.fn().mockImplementation(function (input) {
        this.input = input
      })
    }))
    vi.doMock('~/src/features/common/helpers/logging/logger.js', () => ({
      createLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn() }))
    }))
    ;({ auditEvent, AuditEvent } = await import('./audit-event.js'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  const getPublishedPayload = () => {
    const [publishCommandInstance] = mockSend.mock.calls[0]
    return JSON.parse(publishCommandInstance.input.Message)
  }

  test('does not include a security block', async () => {
    await auditEvent(AuditEvent.SFI_APPLICATION_VALIDATED, {
      applicationId: 'app-1'
    })

    expect(getPublishedPayload().security).toBeUndefined()
  })

  test('publishes correct audit fields, including the eligibility decisions and explanations', async () => {
    const context = {
      correlationId: 'corr-xyz',
      applicationId: 'app-1',
      identifiers: { sbi: 123456789, crn: 'CRN-001' },
      request: { landActions: [{ sheetId: 'SD2324', parcelId: '1253' }] },
      response: {
        valid: false,
        actions: [
          {
            actionCode: 'BND1',
            hasPassed: false,
            rules: [
              {
                name: 'sssi-consent-required',
                passed: false,
                explanations: [{ title: 'sssi check', lines: ['reason'] }]
              }
            ]
          }
        ]
      }
    }

    await auditEvent(AuditEvent.SFI_APPLICATION_VALIDATED, context)

    const payload = getPublishedPayload()
    expect(payload.audit).toMatchObject({
      eventtype: 'GrantsApplicationValidated',
      entities: [
        { entity: 'application', action: 'created', entityid: 'app-1' }
      ],
      status: 'success',
      details: context,
      accounts: { sbi: 123456789, crn: 'CRN-001' }
    })
  })
})

describe('auditEvent - WMP_PAYMENT_CALCULATED', () => {
  let auditEvent
  let AuditEvent
  let mockSend

  beforeEach(async () => {
    vi.resetModules()
    mockSend = vi.fn().mockResolvedValue({})
    mockExtractIp.mockReturnValue('192.168.1.100')
    vi.doMock('@aws-sdk/client-sns', () => ({
      SNSClient: vi.fn().mockImplementation(function () {
        this.send = mockSend
      }),
      PublishCommand: vi.fn().mockImplementation(function (input) {
        this.input = input
      })
    }))
    vi.doMock('~/src/features/common/helpers/logging/logger.js', () => ({
      createLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn() }))
    }))
    ;({ auditEvent, AuditEvent } = await import('./audit-event.js'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  const getPublishedPayload = () => {
    const [publishCommandInstance] = mockSend.mock.calls[0]
    return JSON.parse(publishCommandInstance.input.Message)
  }

  test('does not include a security block', async () => {
    await auditEvent(AuditEvent.WMP_PAYMENT_CALCULATED, {
      parcelIds: ['SX067-99238']
    })

    expect(getPublishedPayload().security).toBeUndefined()
  })

  test('publishes correct audit fields, including the WMP payment calculation details', async () => {
    const context = {
      correlationId: 'corr-xyz',
      parcelIds: ['SX067-99238', 'SX067-99239'],
      request: { oldWoodlandAreaHa: 5, newWoodlandAreaHa: 3 },
      response: { agreementTotalPence: 150000 }
    }

    await auditEvent(AuditEvent.WMP_PAYMENT_CALCULATED, context)

    const payload = getPublishedPayload()
    expect(payload.audit).toMatchObject({
      eventtype: 'GrantsWmpPaymentCalculated',
      entities: [
        {
          entity: 'payment',
          action: 'read',
          entityid: 'SX067-99238,SX067-99239'
        }
      ],
      status: 'success',
      details: context
    })
  })

  test('entity id is undefined when parcelIds is absent', async () => {
    await auditEvent(AuditEvent.WMP_PAYMENT_CALCULATED, {})

    expect(getPublishedPayload().audit.entities).toEqual([
      { entity: 'payment', action: 'read', entityid: undefined }
    ])
  })
})

describe('auditEvent - WMP_VALIDATED', () => {
  let auditEvent
  let AuditEvent
  let mockSend

  beforeEach(async () => {
    vi.resetModules()
    mockSend = vi.fn().mockResolvedValue({})
    mockExtractIp.mockReturnValue('192.168.1.100')
    vi.doMock('@aws-sdk/client-sns', () => ({
      SNSClient: vi.fn().mockImplementation(function () {
        this.send = mockSend
      }),
      PublishCommand: vi.fn().mockImplementation(function (input) {
        this.input = input
      })
    }))
    vi.doMock('~/src/features/common/helpers/logging/logger.js', () => ({
      createLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn() }))
    }))
    ;({ auditEvent, AuditEvent } = await import('./audit-event.js'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  const getPublishedPayload = () => {
    const [publishCommandInstance] = mockSend.mock.calls[0]
    return JSON.parse(publishCommandInstance.input.Message)
  }

  test('does not include a security block', async () => {
    await auditEvent(AuditEvent.WMP_VALIDATED, {
      parcelIds: ['SX067-99238']
    })

    expect(getPublishedPayload().security).toBeUndefined()
  })

  test('publishes correct audit fields, including the WMP validation result', async () => {
    const context = {
      correlationId: 'corr-xyz',
      parcelIds: ['SX067-99238'],
      response: { result: { hasPassed: true, code: 'PA3' } }
    }

    await auditEvent(AuditEvent.WMP_VALIDATED, context)

    const payload = getPublishedPayload()
    expect(payload.audit).toMatchObject({
      eventtype: 'GrantsWmpValidated',
      entities: [{ entity: 'wmp', action: 'read', entityid: 'SX067-99238' }],
      status: 'success',
      details: context
    })
  })
})

describe('getCorrelationId', () => {
  let getCorrelationId

  beforeEach(async () => {
    vi.resetModules()
    ;({ getCorrelationId } = await import('./audit-event.js'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('reads the correlation id from the configured tracing header', () => {
    const request = { headers: { 'x-cdp-request-id': 'trace-123' } }

    expect(getCorrelationId(request)).toBe('trace-123')
  })

  test('returns undefined when headers are absent from the request', () => {
    expect(getCorrelationId({})).toBeUndefined()
  })
})

describe('auditEvent error handling', () => {
  let auditEvent
  let mockSend
  let mockLogger

  const UNMAPPED_EVENT = 'SOME_EVENT_NOT_YET_WIRED_UP'

  beforeEach(async () => {
    vi.resetModules()
    mockSend = vi.fn()
    mockLogger = { info: vi.fn(), warn: vi.fn() }
    mockExtractIp.mockReturnValue('192.168.1.100')

    vi.doMock('@aws-sdk/client-sns', () => ({
      SNSClient: vi.fn().mockImplementation(function () {
        this.send = mockSend
      }),
      PublishCommand: vi.fn().mockImplementation(function (input) {
        this.input = input
      })
    }))
    vi.doMock('~/src/features/common/helpers/logging/logger.js', () => ({
      createLogger: vi.fn(() => mockLogger)
    }))
    ;({ auditEvent } = await import('./audit-event.js'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('logs warning when SNS publish fails', async () => {
    const testError = new Error('SNS publish failed')
    const context = { correlationId: 'corr-xyz' }
    mockSend.mockRejectedValue(testError)

    await auditEvent(UNMAPPED_EVENT, context)

    expect(mockLogger.warn).toHaveBeenCalledWith(
      testError,
      `Failed to publish audit event: ${UNMAPPED_EVENT} ${JSON.stringify(context)}`
    )
  })

  test('does not throw when SNS publish fails', async () => {
    mockSend.mockRejectedValue(new Error('SNS publish failed'))

    await expect(auditEvent(UNMAPPED_EVENT, {})).resolves.not.toThrow()
  })

  test('handles AWS SDK errors gracefully', async () => {
    const awsError = new Error('AccessDenied')
    awsError.code = 'AccessDenied'
    mockSend.mockRejectedValue(awsError)

    await auditEvent(UNMAPPED_EVENT, {})

    expect(mockLogger.warn).toHaveBeenCalledWith(
      awsError,
      `Failed to publish audit event: ${UNMAPPED_EVENT} ${JSON.stringify({})}`
    )
  })
})
