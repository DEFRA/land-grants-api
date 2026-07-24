import { networkInterfaces } from 'node:os'

/**
 * Sentinel audit schema constraint: `ip` must be present and at most 20
 * characters long (covers IPv4 and standard IPv6, but not multi-IP strings).
 */
const MAX_IP_LENGTH = 20

/**
 * Finds the first non-internal IPv4 address across all network interfaces.
 * @param {object} interfaces result of `networkInterfaces()`
 * @returns {{address: string}|undefined}
 */
const findNonInternalIPv4 = (interfaces) =>
  Object.values(interfaces)
    .flat()
    .find((addr) => addr?.family === 'IPv4' && !addr?.internal)

/**
 * Resolves and caches this service's own non-internal IPv4 address, used as
 * the audit `ip` for events that originate from scheduled tasks / SQS message
 * processors where there is no inbound HTTP request to attribute.
 * Falls back to `127.0.0.1` if no external interface is found, so the audit
 * payload always satisfies the mandatory `ip` field.
 * @returns {string}
 */
let cachedServiceIp = null
export const getServiceIp = () => {
  if (cachedServiceIp) {
    return cachedServiceIp
  }
  try {
    const found = findNonInternalIPv4(networkInterfaces())
    if (found) {
      cachedServiceIp = found.address
      return cachedServiceIp
    }
  } catch {
    // ignore — fall through to loopback default
  }
  cachedServiceIp = '127.0.0.1'
  return cachedServiceIp
}

/**
 * Normalises a raw IP string to a single, schema-compliant address.
 *  - keeps only the first entry of an `x-forwarded-for` style list
 *  - strips a trailing `:port` from IPv4 (`1.2.3.4:5678` → `1.2.3.4`)
 *  - strips an IPv6 zone id (`fe80::1%eth0` → `fe80::1`)
 *  - returns `''` if the result is still longer than 20 chars (caller falls back)
 * @param {string} raw
 * @returns {string}
 */
export const sanitiseIp = (raw) => {
  if (!raw || typeof raw !== 'string') {
    return ''
  }
  let ip = raw.split(',')[0].trim()
  // strip IPv6 zone id
  ip = ip.split('%')[0]
  // strip :port from IPv4 (an IPv6 address contains multiple colons, leave it alone)
  if ((ip.match(/:/g) ?? []).length === 1) {
    ip = ip.split(':')[0]
  }
  if (ip.length === 0 || ip.length > MAX_IP_LENGTH) {
    return ''
  }
  return ip
}

/**
 * Resolve the IP to record on the audit event.
 *  - If an inbound Hapi request is provided, prefer the first
 *    `x-forwarded-for` entry, then `request.info.remoteAddress`.
 *  - If neither yields a usable single IP within the 20-char limit, or no
 *    request is provided (e.g. SQS / scheduled task), fall back to this
 *    service's own IP so the mandatory `ip` field is always populated.
 * @param {object} [request]
 * @returns {string}
 */
export const extractIp = (request) => {
  const forwarded = sanitiseIp(request?.headers?.['x-forwarded-for'])
  if (forwarded) {
    return forwarded
  }
  const remote = sanitiseIp(request?.info?.remoteAddress)
  if (remote) {
    return remote
  }
  return getServiceIp()
}
