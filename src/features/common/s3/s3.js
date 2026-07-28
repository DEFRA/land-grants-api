import { GetObjectCommand } from '@aws-sdk/client-s3'
import { s3IngestFolders } from '../../land-data-ingest/s3-folders.js'

/**
 * Get a file from S3 bucket
 * @param {object} s3Client - S3 client instance
 * @param {string} bucket - S3 bucket name
 * @param {string} key - S3 object key (file path)
 * @returns {Promise<any>} The readable stream representation of the file
 */
export async function getFile(s3Client, bucket, key) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    })

    const response = await s3Client.send(command)

    return response
  } catch (error) {
    throw new Error(
      `Failed to get file "${key}" from S3 bucket "${bucket}": ${error.message}`
    )
  }
}

/**
 * Configure the S3 key for the failed resource
 * @param {string} key - The key of the resource
 * @returns {string} The configured S3 key
 */
export const failedBucketPath = (key) => {
  return `${s3IngestFolders.FAILED}/${key}`
}
