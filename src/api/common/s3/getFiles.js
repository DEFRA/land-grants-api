import { ListObjectsV2Command } from '@aws-sdk/client-s3'

/**
 * Get files from S3 bucket
 * @param {object} s3Client - S3 client instance
 * @param {string} bucket - S3 bucket name
 * @returns {Promise<string[]>} Array of file keys
 */
async function getFiles(s3Client, bucket) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucket
    })

    const response = await s3Client.send(command)

    if (!response.Contents || response.Contents.length === 0) {
      return []
    }

    return response.Contents.map((item) => item.Key).filter(
      (key) => key !== undefined
    )
  } catch (error) {
    throw new Error(
      `Failed to list files from S3 bucket "${bucket}": ${error.message}`
    )
  }
}

export { getFiles }
