import { vi } from 'vitest'
import { Client } from '@hapi/catbox'
import { Engine } from '@hapi/catbox-memory'
import { createMemoryCache } from './memory-cache.js'

describe('createMemoryCache', () => {
  let cache

  beforeEach(() => {
    cache = createMemoryCache({
      partition: 'test-partition',
      segment: 'test-segment',
      id: 'test-id',
      ttlMs: 60 * 60 * 1000
    })
  })

  afterEach(async () => {
    await cache.stop()
  })

  test('should expose configured key and ttl', () => {
    expect(cache.key).toEqual({ segment: 'test-segment', id: 'test-id' })
    expect(cache.ttlMs).toBe(60 * 60 * 1000)
  })

  test('should store and retrieve values with lastUpdated by default', async () => {
    await cache.start()

    const value = { count: 10 }
    const cachedValue = await cache.set(value)

    expect(cachedValue).toEqual(
      expect.objectContaining({
        count: 10,
        lastUpdated: expect.any(String)
      })
    )
    expect(await cache.get()).toEqual(cachedValue)
  })

  test('should store values without lastUpdated when disabled', async () => {
    const cacheWithoutTimestamp = createMemoryCache({
      partition: 'test-partition',
      segment: 'plain-segment',
      id: 'plain-id',
      ttlMs: 1000,
      includeLastUpdated: false
    })

    await cacheWithoutTimestamp.start()

    const value = { count: 5 }
    const cachedValue = await cacheWithoutTimestamp.set(value)

    expect(cachedValue).toEqual(value)
    expect(await cacheWithoutTimestamp.get()).toEqual(value)

    await cacheWithoutTimestamp.stop()
  })

  test('should return null when cache is empty', async () => {
    await cache.start()

    expect(await cache.get()).toBeNull()
  })

  test('should refresh cached values from a refresh function', async () => {
    await cache.start()

    const refreshFn = vi.fn().mockResolvedValue({ count: 42 })
    const cachedValue = await cache.refresh(refreshFn)

    expect(refreshFn).toHaveBeenCalledTimes(1)
    expect(cachedValue).toEqual(
      expect.objectContaining({
        count: 42,
        lastUpdated: expect.any(String)
      })
    )
    expect(await cache.get()).toEqual(cachedValue)
  })

  test('should not cache when refresh function returns undefined', async () => {
    await cache.start()

    const result = await cache.refresh(() => Promise.resolve(undefined))

    expect(result).toBeUndefined()
    expect(await cache.get()).toBeNull()
  })

  test('should reuse existing client on start', async () => {
    const firstClient = await cache.start()
    const secondClient = await cache.start()

    expect(firstClient).toBe(secondClient)
    expect(firstClient).toBeInstanceOf(Client)
    expect(firstClient.connection).toBeInstanceOf(Engine)
  })

  test('should isolate values between cache instances', async () => {
    const otherCache = createMemoryCache({
      partition: 'other-partition',
      segment: 'other-segment',
      id: 'other-id',
      ttlMs: 1000
    })

    await cache.start()
    await otherCache.start()

    await cache.set({ count: 1 })
    await otherCache.set({ count: 2 })

    expect(await cache.get()).toEqual(
      expect.objectContaining({ count: 1, lastUpdated: expect.any(String) })
    )
    expect(await otherCache.get()).toEqual(
      expect.objectContaining({ count: 2, lastUpdated: expect.any(String) })
    )

    await otherCache.stop()
  })
})
