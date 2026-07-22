import { withTaskLock } from './task-lock.js'

describe('task-lock helper', () => {
  let mockClient
  let mockPool

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
      release: vi.fn()
    }

    mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
      query: vi.fn()
    }
  })

  describe('when lock is acquired', () => {
    beforeEach(() => {
      mockClient.query.mockResolvedValueOnce({}) // BEGIN
      mockClient.query.mockResolvedValueOnce({}) // DELETE expired
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 }) // INSERT
      mockClient.query.mockResolvedValueOnce({}) // COMMIT
      mockPool.query.mockResolvedValueOnce({}) // releaseTaskLock
    })

    test('runs fn and returns result', async () => {
      const fn = vi.fn().mockResolvedValue('ok')

      const { acquired, result } = await withTaskLock(mockPool, 't', fn, {
        timeoutMinutes: 1
      })

      expect(acquired).toBe(true)
      expect(result).toBe('ok')
      expect(fn).toHaveBeenCalled()
    })

    test('releases lock after fn completes', async () => {
      await withTaskLock(mockPool, 't', vi.fn().mockResolvedValue('ok'), {
        timeoutMinutes: 1
      })

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM task_lock WHERE task_name = $1',
        ['t']
      )
    })

    test('releases lock even if fn throws', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('work failed'))

      await expect(
        withTaskLock(mockPool, 't', fn, { timeoutMinutes: 1 })
      ).rejects.toThrow('work failed')

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM task_lock WHERE task_name = $1',
        ['t']
      )
    })
  })

  describe('when lock is not acquired', () => {
    beforeEach(() => {
      mockClient.query.mockResolvedValueOnce({}) // BEGIN
      mockClient.query.mockResolvedValueOnce({}) // DELETE expired
      mockClient.query.mockResolvedValueOnce({ rowCount: 0 }) // INSERT did nothing
      mockClient.query.mockResolvedValueOnce({}) // COMMIT
    })

    test('returns acquired false and does not run fn', async () => {
      const fn = vi.fn()

      const res = await withTaskLock(mockPool, 't', fn)

      expect(res.acquired).toBe(false)
      expect(fn).not.toHaveBeenCalled()
    })
  })

  describe('when acquireTaskLock errors', () => {
    test('propagates error and releases client', async () => {
      mockClient.query.mockResolvedValueOnce({}) // BEGIN
      mockClient.query.mockRejectedValueOnce(new Error('boom')) // DELETE fails
      mockClient.query.mockResolvedValueOnce({}) // ROLLBACK

      await expect(withTaskLock(mockPool, 't', vi.fn())).rejects.toThrow('boom')

      expect(mockClient.release).toHaveBeenCalled()
    })
  })

  describe('when releaseTaskLock fails', () => {
    test('swallows error and still returns result', async () => {
      mockClient.query.mockResolvedValueOnce({}) // BEGIN
      mockClient.query.mockResolvedValueOnce({}) // DELETE expired
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 }) // INSERT
      mockClient.query.mockResolvedValueOnce({}) // COMMIT
      mockPool.query.mockRejectedValueOnce(new Error('delete-failed'))

      const fn = vi.fn().mockResolvedValue('ok')

      const { acquired, result } = await withTaskLock(mockPool, 't', fn, {
        timeoutMinutes: 1
      })

      expect(acquired).toBe(true)
      expect(result).toBe('ok')
    })
  })
})
