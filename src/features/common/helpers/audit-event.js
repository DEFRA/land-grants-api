import { SNSClient } from '@aws-sdk/client-sns'
import { publishAuditEvent } from '@defra/fcp-audit-publisher'

import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/features/common/helpers/logging/logger.js'
import { extractIp } from '~/src/features/common/helpers/request-ip.js'

export class InvalidEventType extends Error {
  constructor(eventType) {
    super(`Invalid audit event type: ${eventType}`)
    this.eventType = eventType
  }
}

/**
 * Resolves the correlation id to record on audit events from the tracing header.
 * @param {import('@hapi/hapi').Request} request
 * @returns {string|string[]|undefined}
 */
export const getCorrelationId = (request) =>
  /** @type {string | string[] | undefined} */ (
    request.headers?.[config.get('tracing.header')]
  )

/**
 * Audit event types. Populated by tickets as land-grants-api operations are
 * wired up to auditing.
 * @enum {string}
 */
export const AuditEvent = Object.freeze({
  SFI_PAYMENT_CALCULATED: 'SFI_PAYMENT_CALCULATED',
  SFI_APPLICATION_VALIDATED: 'SFI_APPLICATION_VALIDATED',
  WMP_PAYMENT_CALCULATED: 'WMP_PAYMENT_CALCULATED',
  WMP_PAYMENT_TOTAL_CALCULATED: 'WMP_PAYMENT_TOTAL_CALCULATED',
  WMP_VALIDATED: 'WMP_VALIDATED'
})

// Human-readable description for each audit event, used in security.details.message
export const eventMessages = {
  [AuditEvent.SFI_PAYMENT_CALCULATED]: 'Payment calculation completed',
  [AuditEvent.SFI_APPLICATION_VALIDATED]:
    'Application eligibility validation completed',
  [AuditEvent.WMP_PAYMENT_CALCULATED]: 'WMP payment calculation completed',
  [AuditEvent.WMP_PAYMENT_TOTAL_CALCULATED]:
    'WMP total payment calculation completed',
  [AuditEvent.WMP_VALIDATED]: 'WMP validation completed'
}

// Transaction code for each audit event, used in security.details.transactioncode
const eventTransactionCodes = {}

// PMC code for each audit event, used in security.pmccode. Neither event has
// one yet - they are not forwarded to the SOC, so they carry no security block.
const eventPmcCodes = {}

// Audit event type for each audit event, sent as details.eventType
export const eventTypes = {
  [AuditEvent.SFI_PAYMENT_CALCULATED]: 'GrantsPaymentCalculated',
  [AuditEvent.SFI_APPLICATION_VALIDATED]: 'GrantsApplicationValidated',
  [AuditEvent.WMP_PAYMENT_CALCULATED]: 'GrantsWmpPaymentCalculated',
  [AuditEvent.WMP_PAYMENT_TOTAL_CALCULATED]: 'GrantsWmpPaymentTotalCalculated',
  [AuditEvent.WMP_VALIDATED]: 'GrantsWmpValidated'
}

// Entities for each audit event, used in audit.entities
// N.B. entityid can be an empty string when no logical ID is present, but cannot be undefined
export const eventEntities = {
  [AuditEvent.SFI_PAYMENT_CALCULATED]: () => [
    { entity: 'paymentSchedule', action: 'calculate', entityid: '' }
  ],
  [AuditEvent.SFI_APPLICATION_VALIDATED]: (context) => [
    {
      entity: 'application',
      action: 'create',
      entityid: context.applicationId
    }
  ],
  [AuditEvent.WMP_PAYMENT_CALCULATED]: () => [
    {
      entity: 'paymentSchedule',
      action: 'calculate',
      entityid: ''
    }
  ],
  [AuditEvent.WMP_PAYMENT_TOTAL_CALCULATED]: () => [
    {
      entity: 'paymentSchedule',
      action: 'calculate',
      entityid: ''
    }
  ],
  [AuditEvent.WMP_VALIDATED]: () => [
    { entity: 'wmp', action: 'validate', entityid: '' }
  ]
}

/**
 * Builds the full audit payload for a land-grants-api operation.
 * @param {AuditEvent} event
 * @param {object} context
 * @param {'success'|'failure'} status
 * @param {import('@hapi/hapi').Request|null} request
 */
const buildAuditPayload = (
  event,
  context = {},
  status = 'success',
  request = null
) => {
  // Events are only forwarded to the SOC once a pmc code has been agreed
  // with the security team; until then the payload carries no `security`
  // block at all (not just one with empty/undefined fields).
  const hasSecurity = eventPmcCodes[event] !== undefined
  const entitiesFunc = eventEntities[event]

  if (!entitiesFunc) {
    throw new InvalidEventType(event)
  }

  return {
    application: 'Grants',
    component: config.get('serviceName'),
    correlationid: context.correlationId,
    datetime: new Date().toISOString(),
    environment: `cdp-${config.get('cdpEnvironment')}`,
    ip: extractIp(request),
    sessionid: context.sessionId,
    user: context.user,
    version: '0.1.0',

    ...(hasSecurity && {
      security: {
        pmccode: eventPmcCodes[event],
        priority: '0',
        details: {
          transactioncode: eventTransactionCodes[event],
          message: eventMessages[event],
          additionalinfo: context.additionalInfo
        }
      }
    }),

    audit: {
      entities: entitiesFunc(context),
      status,
      details: { eventType: eventTypes[event], ...context },
      accounts: {
        sbi: context.identifiers?.sbi,
        frn: context.identifiers?.frn,
        crn: context.identifiers?.crn
      }
    }
  }
}

/** @type {import('@aws-sdk/client-sns').SNSClient|null} */
let snsClient = null

const getSnsClient = () => {
  if (!snsClient) {
    snsClient = new SNSClient({
      region: config.get('aws.region'),
      endpoint: config.get('sns.endpoint')
    })
  }
  return snsClient
}

/**
 * Records a land-grants-api audit event by publishing it to the FCP
 * Sentinel audit SNS topic.
 * @param {AuditEvent} event
 * @param {object} [context]
 * @param {'success'|'failure'} [status]
 * @param {import('@hapi/hapi').Request|null} [request]
 */
export const auditEvent = async (
  event,
  context = {},
  status = 'success',
  request = null
) => {
  const logger = createLogger()
  const auditPayload = buildAuditPayload(event, context, status, request)
  const client = getSnsClient()

  const auditConfig = {
    snsClient: client,
    sns: { topicArn: config.get('sns.auditTopicArn') },
    generateCorrelationId: false
  }

  try {
    await publishAuditEvent(auditPayload, auditConfig)

    logger.info(`Audit event successfully published: ${event}`)
  } catch (error) {
    logger.error(error, `Failed to publish audit event: ${event}`)
  }
}
