/**
 * Helpers to acquire and release a named task lock stored in Postgres.
 * Uses a `task_lock` table (created via Liquibase) with columns:
 *  - task_name (PK)
 *  - acquired_at
 *  - expires_at
 *
 * Usage:
 *   const locked = await acquireTaskLock(pool, 'refreshStats')
 *   if (!locked) return // another instance holds the lock
 *   try { await doWork() } finally { await releaseTaskLock(pool, 'refreshStats') }
 */

/**
 * Acquire a named task lock. Inserts a row into `task_lock` and prevents
 * concurrent runners from acquiring the same task until `expires_at`.
 * Expired locks are removed prior to attempting acquisition.
 * @param {import('pg').Pool} pool - Postgres connection pool
 * @param {string} taskName - Unique task name to lock (e.g. 'refreshStats')
 * @param {{timeoutMinutes?: number}} [options] - Lock options
 * @returns {Promise<boolean>} True if the lock was acquired, false otherwise
 */
async function acquireTaskLock(pool, taskName, { timeoutMinutes = 5 } = {}) {
  const timeoutMs = Math.max(1, Number(timeoutMinutes)) * 60 * 1000
  const expiresAt = new Date(Date.now() + timeoutMs).toISOString()

  // We use a transaction to remove expired locks and try to insert/update atomically.
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Remove expired lock for this task so a new instance can acquire it.
    await client.query(
      'DELETE FROM task_lock WHERE task_name = $1 AND expires_at < now()',
      [taskName]
    )

    // Try to insert a new lock. If task_name already exists, the ON CONFLICT
    // will only win if the existing row is expired (we deleted expired above),
    // otherwise the DO NOTHING leaves the row intact.
    const insertSql = `
      INSERT INTO task_lock (task_name, acquired_at, expires_at)
      VALUES ($1, now(), $2)
      ON CONFLICT (task_name) DO NOTHING
      RETURNING task_name
    `

    const res = await client.query(insertSql, [taskName, expiresAt])

    await client.query('COMMIT')

    return res.rowCount > 0
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch (e) {
      // ignore
    }
    throw err
  } finally {
    client.release()
  }
}

/**
 * Release a previously acquired task lock by deleting its row.
 * This is a best-effort operation and will swallow errors.
 * @param {import('pg').Pool} pool - Postgres connection pool
 * @param {string} taskName - The task name to release
 * @returns {Promise<void>}
 */
async function releaseTaskLock(pool, taskName) {
  // Best-effort cleanup of the lock row so other instances can run immediately.
  // Do not throw if deletion fails; caller may already be shutting down.
  try {
    await pool.query('DELETE FROM task_lock WHERE task_name = $1', [taskName])
  } catch (err) {
    // ignore
  }
}

/**
 * Convenience wrapper that acquires the lock, runs `fn`, and releases the lock.
 * Returns an object with `acquired` flag and optional `result` from `fn`.
 * @param {import('pg').Pool} pool - Postgres connection pool
 * @param {string} taskName - Unique task name to lock
 * @param {() => Promise<any>} fn - Async function to run when lock is acquired
 * @param {{timeoutMinutes?: number}} [options] - Lock options
 * @returns {Promise<{acquired: boolean, result?: any}>}
 */
export async function withTaskLock(pool, taskName, fn, options = {}) {
  const acquired = await acquireTaskLock(pool, taskName, options)
  if (!acquired) {
    return { acquired: false }
  }

  try {
    const result = await fn()
    return { acquired: true, result }
  } finally {
    await releaseTaskLock(pool, taskName)
  }
}
