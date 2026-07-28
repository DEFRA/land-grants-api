import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mockNetworkInterfaces = vi.hoisted(() => vi.fn());

vi.mock('node:os', () => ({
  networkInterfaces: mockNetworkInterfaces
}));

describe('extractIp', () => {
  let extractIp;

  beforeEach(async () => {
    vi.resetModules();
    mockNetworkInterfaces.mockReturnValue({
      eth0: [{ address: '192.168.1.100', family: 'IPv4', internal: false }]
    });
    ({ extractIp } = await import('./request-ip.js'));
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  test('prefers the first x-forwarded-for entry', () => {
    const request = {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
      info: { remoteAddress: '9.9.9.9' }
    };

    expect(extractIp(request)).toBe('1.2.3.4');
  });

  test('falls back to request.info.remoteAddress when x-forwarded-for is absent', () => {
    const request = { headers: {}, info: { remoteAddress: '9.9.9.9' } };

    expect(extractIp(request)).toBe('9.9.9.9');
  });

  test('falls back to request.info.remoteAddress when x-forwarded-for sanitises to empty', () => {
    const request = {
      headers: { 'x-forwarded-for': '' },
      info: { remoteAddress: '9.9.9.9' }
    };

    expect(extractIp(request)).toBe('9.9.9.9');
  });

  test('falls back to the service IP when no request is provided', () => {
    expect(extractIp()).toBe('192.168.1.100');
  });

  test('falls back to the service IP when the request has no usable IP', () => {
    const request = { headers: {}, info: {} };

    expect(extractIp(request)).toBe('192.168.1.100');
  });

  test('falls back to the service IP when request.headers is absent', () => {
    expect(extractIp({})).toBe('192.168.1.100');
  });
});
