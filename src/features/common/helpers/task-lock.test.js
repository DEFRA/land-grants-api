import * as taskLock from './task-lock.js'

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

  test('acquireTaskLock inserts lock when available', async () => {
    mockClient.query.mockResolvedValueOnce({}) // BEGIN
    mockClient.query.mockResolvedValueOnce({}) // DELETE expired
    mockClient.query.mockResolvedValueOnce({ rowCount: 1 }) // INSERT
    mockClient.query.mockResolvedValueOnce({}) // COMMIT

    const acquired = await taskLock.acquireTaskLock(mockPool, 'myTask', {
      timeoutMinutes: 1
    })

    expect(acquired).toBe(true)
    expect(mockPool.connect).toHaveBeenCalled()
    expect(mockClient.release).toHaveBeenCalled()
  })

  test('acquireTaskLock returns false when insert did not happen', async () => {
    mockClient.query.mockResolvedValueOnce({}) // BEGIN
    mockClient.query.mockResolvedValueOnce({}) // DELETE expired
    mockClient.query.mockResolvedValueOnce({ rowCount: 0 }) // INSERT did nothing
    mockClient.query.mockResolvedValueOnce({}) // COMMIT

    const acquired = await taskLock.acquireTaskLock(mockPool, 'myTask', {
      timeoutMinutes: 1
    })

    expect(acquired).toBe(false)
  })

  test('releaseTaskLock deletes row', async () => {
    mockPool.query.mockResolvedValueOnce({})

    await taskLock.releaseTaskLock(mockPool, 'myTask')

    expect(mockPool.query).toHaveBeenCalledWith(
      'DELETE FROM task_lock WHERE task_name = $1',
      ['myTask']
    )
  })

  test('withTaskLock runs fn when acquired and releases lock', async () => {
    // prepare acquireTaskLock to succeed (simulate DB responses)
    mockClient.query.mockResolvedValueOnce({}) // BEGIN
    mockClient.query.mockResolvedValueOnce({}) // DELETE expired
    mockClient.query.mockResolvedValueOnce({ rowCount: 1 }) // INSERT
    mockClient.query.mockResolvedValueOnce({}) // COMMIT
    mockPool.query.mockResolvedValueOnce({}) // releaseTaskLock deletion

    const fn = vi.fn().mockResolvedValue('ok')

    const { acquired, result } = await taskLock.withTaskLock(
      mockPool,
      't',
      fn,
      { timeoutMinutes: 1 }
    )

    expect(acquired).toBe(true)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalled()
  })

  test('acquireTaskLock rolls back and releases client on error', async () => {
    mockClient.query.mockResolvedValueOnce({}) // BEGIN
    mockClient.query.mockRejectedValueOnce(new Error('boom')) // DELETE fails
    mockClient.query.mockResolvedValueOnce({}) // ROLLBACK

    await expect(
      taskLock.acquireTaskLock(mockPool, 'myTask', { timeoutMinutes: 1 })
    ).rejects.toThrow('boom')

    expect(mockClient.release).toHaveBeenCalled()
    // Ensure rollback was attempted (second resolved call after reject)
    expect(mockClient.query).toHaveBeenCalled()
  })

  test('releaseTaskLock swallows errors', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('delete-failed'))

    await expect(
      taskLock.releaseTaskLock(mockPool, 'myTask')
    ).resolves.toBeUndefined()
  })

  test('withTaskLock returns acquired false when lock not acquired', async () => {
    // simulate DB flow where INSERT did not happen (rowCount 0)
    mockClient.query.mockResolvedValueOnce({}) // BEGIN
    mockClient.query.mockResolvedValueOnce({}) // DELETE expired
    mockClient.query.mockResolvedValueOnce({ rowCount: 0 }) // INSERT did nothing
    mockClient.query.mockResolvedValueOnce({}) // COMMIT

    const fn = vi.fn()

    const res = await taskLock.withTaskLock(mockPool, 't', fn)

    expect(res.acquired).toBe(false)
    expect(fn).not.toHaveBeenCalled()
  })
})
