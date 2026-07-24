import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const mockNetworkInterfaces = vi.hoisted(() => vi.fn())

vi.mock('node:os', () => ({
  networkInterfaces: mockNetworkInterfaces
}))

describe('sanitiseIp', () => {
  let sanitiseIp

  beforeEach(async () => {
    vi.resetModules()
    ;({ sanitiseIp } = await import('./request-ip.js'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('returns an already-clean IPv4 address unchanged', () => {
    expect(sanitiseIp('1.2.3.4')).toBe('1.2.3.4')
  })

  test('returns an already-clean IPv6 address unchanged', () => {
    expect(sanitiseIp('2001:db8::1')).toBe('2001:db8::1')
  })

  test('keeps only the first entry of an x-forwarded-for list', () => {
    expect(sanitiseIp('1.2.3.4, 5.6.7.8, 9.10.11.12')).toBe('1.2.3.4')
  })

  test('trims whitespace around the first entry', () => {
    expect(sanitiseIp('  1.2.3.4  , 5.6.7.8')).toBe('1.2.3.4')
  })

  test('strips a trailing port from an IPv4 address', () => {
    expect(sanitiseIp('1.2.3.4:5678')).toBe('1.2.3.4')
  })

  test('strips an IPv6 zone id', () => {
    expect(sanitiseIp('fe80::1%eth0')).toBe('fe80::1')
  })

  test('does not strip a port-like suffix from an IPv6 address', () => {
    expect(sanitiseIp('2001:db8::1')).toBe('2001:db8::1')
  })

  test('returns an empty string for a result longer than 20 characters', () => {
    expect(sanitiseIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe('')
  })

  test('returns an empty string for null', () => {
    expect(sanitiseIp(null)).toBe('')
  })

  test('returns an empty string for undefined', () => {
    expect(sanitiseIp(undefined)).toBe('')
  })

  test('returns an empty string for an empty string', () => {
    expect(sanitiseIp('')).toBe('')
  })

  test('returns an empty string for a non-string value', () => {
    expect(sanitiseIp(12345)).toBe('')
  })
})

describe('getServiceIp', () => {
  let getServiceIp

  beforeEach(async () => {
    vi.resetModules()
    ;({ getServiceIp } = await import('./request-ip.js'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('returns the first non-internal IPv4 address', () => {
    mockNetworkInterfaces.mockReturnValue({
      lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
      eth0: [{ address: '192.168.1.100', family: 'IPv4', internal: false }]
    })

    expect(getServiceIp()).toBe('192.168.1.100')
  })

  test('skips interface entries that are undefined', () => {
    mockNetworkInterfaces.mockReturnValue({
      eth0: undefined,
      eth1: [{ address: '10.0.0.9', family: 'IPv4', internal: false }]
    })

    expect(getServiceIp()).toBe('10.0.0.9')
  })

  test('ignores non-internal IPv6 interfaces', () => {
    mockNetworkInterfaces.mockReturnValue({
      eth0: [{ address: 'fe80::1', family: 'IPv6', internal: false }]
    })

    expect(getServiceIp()).toBe('127.0.0.1')
  })

  test('falls back to 127.0.0.1 when no non-internal IPv4 interface is found', () => {
    mockNetworkInterfaces.mockReturnValue({
      lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true }]
    })

    expect(getServiceIp()).toBe('127.0.0.1')
  })

  test('falls back to 127.0.0.1 when networkInterfaces() throws', () => {
    mockNetworkInterfaces.mockImplementation(() => {
      throw new Error('boom')
    })

    expect(getServiceIp()).toBe('127.0.0.1')
  })

  test('caches the resolved address across calls', () => {
    mockNetworkInterfaces.mockReturnValue({
      eth0: [{ address: '192.168.1.100', family: 'IPv4', internal: false }]
    })

    expect(getServiceIp()).toBe('192.168.1.100')

    mockNetworkInterfaces.mockReturnValue({
      eth0: [{ address: '10.0.0.1', family: 'IPv4', internal: false }]
    })

    expect(getServiceIp()).toBe('192.168.1.100')
    expect(mockNetworkInterfaces).toHaveBeenCalledTimes(1)
  })
})

describe('extractIp', () => {
  let extractIp

  beforeEach(async () => {
    vi.resetModules()
    mockNetworkInterfaces.mockReturnValue({
      eth0: [{ address: '192.168.1.100', family: 'IPv4', internal: false }]
    })
    ;({ extractIp } = await import('./request-ip.js'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('prefers the first x-forwarded-for entry', () => {
    const request = {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
      info: { remoteAddress: '9.9.9.9' }
    }

    expect(extractIp(request)).toBe('1.2.3.4')
  })

  test('falls back to request.info.remoteAddress when x-forwarded-for is absent', () => {
    const request = { headers: {}, info: { remoteAddress: '9.9.9.9' } }

    expect(extractIp(request)).toBe('9.9.9.9')
  })

  test('falls back to request.info.remoteAddress when x-forwarded-for sanitises to empty', () => {
    const request = {
      headers: { 'x-forwarded-for': '' },
      info: { remoteAddress: '9.9.9.9' }
    }

    expect(extractIp(request)).toBe('9.9.9.9')
  })

  test('falls back to the service IP when no request is provided', () => {
    expect(extractIp()).toBe('192.168.1.100')
  })

  test('falls back to the service IP when the request has no usable IP', () => {
    const request = { headers: {}, info: {} }

    expect(extractIp(request)).toBe('192.168.1.100')
  })

  test('falls back to the service IP when request.headers is absent', () => {
    expect(extractIp({})).toBe('192.168.1.100')
  })
})
