import { networkInterfaces } from 'node:os'

import { PublishCommand, SNSClient } from '@aws-sdk/client-sns'
import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/features/common/helpers/logging/logger.js'

/**
 * Resolves the IP to record on the audit event: prefers the Hapi server's
 * bound host (when not the "listen on all interfaces" wildcard), then falls
 * back to this service's own non-internal IPv4 address.
 * @param {import('@hapi/hapi').Request|null} [request]
 * @returns {string}
 */
const getLocalIp = (request) => {
  const hapiHost = request?.server?.info?.host
  if (hapiHost && hapiHost !== '0.0.0.0') {
    return hapiHost
  }
  for (const iface of Object.values(networkInterfaces())) {
    for (const addr of iface ?? []) {
      if (!addr.internal && addr.family === 'IPv4') {
        return addr.address
      }
    }
  }
  return ''
}

/**
 * Audit event types. Populated by tickets as land-grants-api operations are
 * wired up to auditing.
 * @enum {string}
 */
export const AuditEvent = Object.freeze({
  PAYMENT_CALCULATED: 'PAYMENT_CALCULATED'
})

// Human-readable description for each audit event, used in security.details.message
const eventMessages = {
  [AuditEvent.PAYMENT_CALCULATED]: 'Payment calculation completed'
}

// Transaction code for each audit event, used in security.details.transactioncode
const eventTransactionCodes = {}

// PMC code for each audit event, used in security.pmccode. PAYMENT_CALCULATED
// has none - it is not forwarded to the SOC, so it carries no security block.
const eventPmcCodes = {}

// Audit event type for each audit event, used in audit.eventtype
const eventTypes = {
  [AuditEvent.PAYMENT_CALCULATED]: 'GrantsPaymentCalculated'
}

// Entities for each audit event, used in audit.entities
// action must be one of: created, read, updated, deleted, submitted, accepted, rejected, withdrawn
const eventEntities = {
  [AuditEvent.PAYMENT_CALCULATED]: (context) => [
    { entity: 'payment', action: 'read', entityid: context.applicationId }
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
  const hasSecurity = eventPmcCodes[event] != null

  return {
    sessionid: context.sessionId,
    user: context.user,
    correlationid: context.correlationId,
    datetime: new Date().toISOString(),
    environment: `cdp-${config.get('cdpEnvironment')}`,
    version: '0.1.0',
    application: 'Grants',
    component: config.get('serviceName'),
    ip: getLocalIp(request),

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
      eventtype: eventTypes[event],
      entities: eventEntities[event]?.(context) ?? [],
      status,
      details: context,
      accounts: {
        sbi: context.identifiers?.sbi,
        frn: context.identifiers?.frn,
        crn: context.identifiers?.crn
      }
    }
  }
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
  try {
    const client = new SNSClient({
      region: config.get('aws.region'),
      endpoint: config.get('sns.endpoint')
    })

    await client.send(
      new PublishCommand({
        TopicArn: config.get('sns.auditTopicArn'),
        Message: JSON.stringify(
          buildAuditPayload(event, context, status, request)
        )
      })
    )
    logger.info('Audit event successfully published')
  } catch (error) {
    logger.warn(error, 'Failed to publish audit event')
  }
}
