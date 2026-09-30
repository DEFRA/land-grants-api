import { publishAuditEvent } from '@defra/fcp-audit-publisher'

const { validateAuditEvent } = await vi.importActual(
  '@defra/fcp-audit-publisher'
)
const topicArn = 'arn:aws:sns:eu-west-2:000000000000:fcp_audit_land_grants_api'

const mockConfigGet = vi.hoisted(() =>
  vi.fn((key) => {
    const configMap = {
      cdpEnvironment: 'test',
      serviceName: 'land-grants-api',
      'aws.region': 'eu-west-2',
      'sns.endpoint': 'http://localhost:4566',
      'sns.auditTopicArn': topicArn,
      'tracing.header': 'x-cdp-request-id'
    }
    return configMap[key]
  })
)

const mockExtractIp = vi.hoisted(() => vi.fn())

const EVENT_TYPE = 'SFI_PAYMENT_CALCULATED'

function getPublishedPayload() {
  return publishAuditEvent.mock.lastCall[0]
}

vi.mock('@defra/fcp-audit-publisher')
vi.mock('~/src/config/index.js', () => ({ config: { get: mockConfigGet } }))

vi.mock('~/src/features/common/helpers/request-ip.js', () => ({
  extractIp: mockExtractIp
}))

describe('AuditEvent', () => {
  let AuditEvent, eventMessages, eventTypes, eventEntities

  beforeEach(async () => {
    vi.resetModules()
    vi.doMock('@aws-sdk/client-sns', () => ({
      SNSClient: vi.fn().mockImplementation(function () {
        this.send = vi.fn().mockResolvedValue({})
      })
    }))
    vi.doMock('~/src/features/common/helpers/logging/logger.js', () => ({
      createLogger: vi.fn(() => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      }))
    }))
    ;({ AuditEvent, eventEntities, eventMessages, eventTypes } =
      await import('./audit-event.js'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('event configs are present for all event types', () => {
    Object.values(AuditEvent).forEach((eventType) => {
      expect(
        eventEntities[eventType],
        `eventEntities[${eventType}] should exist`
      ).not.toBeUndefined()
      expect(
        eventMessages[eventType],
        `eventMessages[${eventType}] should exist`
      ).not.toBeUndefined()
      expect(
        eventTypes[eventType],
        `eventTypes[${eventType}] should exist`
      ).not.toBeUndefined()
    })
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
  let InvalidEventType
  let mockLogger
  let SNSClient

  beforeEach(async () => {
    vi.resetModules()
    mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    mockExtractIp.mockReturnValue('192.168.1.100')
    vi.doMock('@aws-sdk/client-sns', () => ({
      SNSClient: vi.fn()
    }))
    vi.doMock('~/src/features/common/helpers/logging/logger.js', () => ({
      createLogger: vi.fn(() => mockLogger)
    }))
    ;({ auditEvent, InvalidEventType } = await import('./audit-event.js'))
    ;({ SNSClient } = await import('@aws-sdk/client-sns'))

    publishAuditEvent.mockImplementation(null)
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('creates SNSClient with correct region and endpoint', async () => {
    await auditEvent(EVENT_TYPE, {})

    expect(SNSClient).toHaveBeenCalledWith({
      region: 'eu-west-2',
      endpoint: 'http://localhost:4566'
    })
  })

  test('publishes to the correct topic ARN', async () => {
    await auditEvent(EVENT_TYPE, {})

    expect(publishAuditEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ sns: { topicArn } })
    )
  })

  test('publishes correct top-level fields', async () => {
    const context = {
      correlationId: 'corr-xyz',
      sessionId: 'session-abc',
      user: 'test.user@defra.gov.uk'
    }

    await auditEvent(EVENT_TYPE, context)

    expect(getPublishedPayload()).toMatchObject({
      sessionid: 'session-abc',
      user: 'test.user@defra.gov.uk',
      correlationid: 'corr-xyz',
      environment: 'cdp-test',
      application: 'Grants',
      component: 'land-grants-api'
    })
  })

  test('sessionid and user are undefined when absent from context', async () => {
    await auditEvent(EVENT_TYPE, { correlationId: 'corr-xyz' })

    const payload = getPublishedPayload()
    expect(payload.sessionid).toBeUndefined()
    expect(payload.user).toBeUndefined()
  })

  test('omits the security block entirely for an event with no pmc code', async () => {
    await auditEvent(EVENT_TYPE, {})

    expect(getPublishedPayload().security).toBeUndefined()
  })

  test('publishes correct audit fields', async () => {
    const context = {
      correlationId: 'corr-xyz',
      identifiers: { sbi: 123456789, frn: 1234567890, crn: 'CRN-001' }
    }

    await auditEvent(EVENT_TYPE, context)

    const { audit } = getPublishedPayload()

    expect(audit).toMatchObject({
      entities: [
        { action: 'calculate', entity: 'paymentSchedule', entityid: '' }
      ],
      status: 'success',
      details: context,
      accounts: { sbi: 123456789, frn: 1234567890, crn: 'CRN-001' }
    })
  })

  test('audit.accounts populates only known fields', async () => {
    await auditEvent(EVENT_TYPE, {
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

    await auditEvent(EVENT_TYPE, {}, 'success', mockRequest)

    expect(mockExtractIp).toHaveBeenCalledWith(mockRequest)
    expect(getPublishedPayload().ip).toBe('10.0.0.5')
  })

  test('ip is populated from extractIp(null) when no request is available', async () => {
    await auditEvent(EVENT_TYPE, {})

    expect(mockExtractIp).toHaveBeenCalledWith(null)
    expect(getPublishedPayload().ip).toBe('192.168.1.100')
  })

  test('passes failure status through to the published payload', async () => {
    await auditEvent(EVENT_TYPE, {}, 'failure')

    const payload = getPublishedPayload()
    expect(payload.audit.status).toBe('failure')
  })

  test('will fail audit event validation and be rejected when context is empty', async () => {
    await auditEvent(EVENT_TYPE)

    const payload = getPublishedPayload()
    expect(payload.correlationid).toBeUndefined()
    expect(validateAuditEvent(payload).valid).toBe(false)
  })

  test('defaults status to success when not provided', async () => {
    await auditEvent(EVENT_TYPE, {})

    expect(getPublishedPayload().audit.status).toBe('success')
  })

  test('throws InvalidEventType when event type is unknown', async () => {
    const t = 'SOME_UNKNOWN_EVENT_TYPE'
    await expect(auditEvent(t, {})).rejects.toThrow(new InvalidEventType(t))
  })
})

describe('auditEvent - SFI_PAYMENT_CALCULATED', () => {
  let auditEvent
  let AuditEvent

  beforeEach(async () => {
    vi.resetModules()
    mockExtractIp.mockReturnValue('192.168.1.100')
    vi.doMock('@aws-sdk/client-sns', () => ({
      SNSClient: vi.fn()
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
      entities: [
        { entity: 'paymentSchedule', action: 'calculate', entityid: '' }
      ],
      status: 'success',
      details: { eventType: 'GrantsPaymentCalculated', ...context },
      accounts: { sbi: 123456789 }
    })
    expect(validateAuditEvent(payload).valid).toBe(true)
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

  beforeEach(async () => {
    vi.resetModules()
    mockExtractIp.mockReturnValue('192.168.1.100')
    vi.doMock('@aws-sdk/client-sns', () => ({
      SNSClient: vi.fn()
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
      entities: [
        { entity: 'application', action: 'create', entityid: 'app-1' }
      ],
      status: 'success',
      details: { eventType: 'GrantsApplicationValidated', ...context },
      accounts: { sbi: 123456789, crn: 'CRN-001' }
    })
    expect(validateAuditEvent(payload).valid).toBe(true)
  })
})

describe('auditEvent - WMP_PAYMENT_CALCULATED', () => {
  let auditEvent
  let AuditEvent

  beforeEach(async () => {
    vi.resetModules()
    mockExtractIp.mockReturnValue('192.168.1.100')
    vi.doMock('@aws-sdk/client-sns', () => ({
      SNSClient: vi.fn()
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
      entities: [
        {
          entity: 'paymentSchedule',
          action: 'calculate',
          entityid: ''
        }
      ],
      status: 'success',
      details: { eventType: 'GrantsWmpPaymentCalculated', ...context }
    })
    expect(validateAuditEvent(payload).valid).toBe(true)
  })
})

describe('auditEvent - WMP_PAYMENT_TOTAL_CALCULATED', () => {
  let auditEvent
  let AuditEvent

  beforeEach(async () => {
    vi.resetModules()
    mockExtractIp.mockReturnValue('192.168.1.100')
    vi.doMock('@aws-sdk/client-sns', () => ({
      SNSClient: vi.fn()
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

  test('does not include a security block', async () => {
    await auditEvent(AuditEvent.WMP_PAYMENT_TOTAL_CALCULATED, {
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

    await auditEvent(AuditEvent.WMP_PAYMENT_TOTAL_CALCULATED, context)

    const payload = getPublishedPayload()
    expect(payload.audit).toMatchObject({
      entities: [
        {
          entity: 'paymentSchedule',
          action: 'calculate',
          entityid: ''
        }
      ],
      status: 'success',
      details: { eventType: 'GrantsWmpPaymentTotalCalculated', ...context }
    })
    expect(validateAuditEvent(payload).valid).toBe(true)
  })
})

describe('auditEvent - WMP_VALIDATED', () => {
  let auditEvent
  let AuditEvent

  beforeEach(async () => {
    vi.resetModules()
    mockExtractIp.mockReturnValue('192.168.1.100')
    vi.doMock('@aws-sdk/client-sns', () => ({
      SNSClient: vi.fn()
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
      entities: [{ entity: 'wmp', action: 'validate', entityid: '' }],
      status: 'success',
      details: { eventType: 'GrantsWmpValidated', ...context }
    })
    expect(validateAuditEvent(payload).valid).toBe(true)
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
  let mockLogger

  beforeEach(async () => {
    vi.resetModules()
    mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    mockExtractIp.mockReturnValue('192.168.1.100')

    vi.doMock('@aws-sdk/client-sns', () => ({
      SNSClient: vi.fn()
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

  test('does not throw when SNS publish fails', async () => {
    publishAuditEvent.mockRejectedValue(new Error('SNS publish failed'))

    await expect(auditEvent(EVENT_TYPE, {})).resolves.not.toThrow()
  })
})
