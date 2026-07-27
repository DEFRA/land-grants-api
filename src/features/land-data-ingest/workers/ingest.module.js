import { parentPort } from 'node:worker_threads'
import { importLandData } from './import-land-data.js'

/**
 * Post a message to the parent thread
 * @param {string} taskId - The task ID
 * @param {boolean} success - Whether the task was successful
 * @param {string | null} result - The result of the task
 * @param {string | null} error - The error message
 */
const postMessage = (taskId, success, result, error) => {
  parentPort?.postMessage({
    taskId,
    completedAt: new Date().toISOString(),
    success,
    result,
    error
  })
}

/**
 * @param {{taskId: string, data: {s3key: string, filename?: string, ingestId?: number}}} landData - The data to ingest
 * @returns {Promise<void>}
 */
export async function ingestLandData(landData) {
  try {
    const result = await importLandData(landData.data)
    postMessage(landData.taskId, true, result, null)
  } catch (error) {
    postMessage(landData.taskId, false, null, error.message)
    throw error
  }
}
