import { ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'

/**
 * Get files from S3 bucket
 * @param {object} s3Client - S3 client instance
 * @param {string} bucket - S3 bucket name
 * @returns {Promise<string[]>} Array of file keys
 */
export async function getFiles(s3Client, bucket) {
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

/**
 * Convert a readable stream to a string
 * @param {object} readableStream - The readable stream to convert
 * @returns {Promise<string>} The string representation of the readable stream
 */
async function streamToString(readableStream) {
  const chunks = []
  return new Promise((resolve, reject) => {
    readableStream.on('data', (chunk) => chunks.push(chunk))
    readableStream.on('end', () =>
      resolve(Buffer.concat(chunks).toString('utf-8'))
    )
    readableStream.on('error', reject)
  })
}

/**
 * Get a file from S3 bucket
 * @param {object} s3Client - S3 client instance
 * @param {string} bucket - S3 bucket name
 * @param {string} key - S3 object key (file path)
 * @returns {Promise<ReadableStream>} The readable stream representation of the file
 */
export async function getFile(s3Client, bucket, key) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    })

    const response = await s3Client.send(command)

    return response.Body.transformToWebStream()
  } catch (error) {
    throw new Error(
      `Failed to get file "${key}" from S3 bucket "${bucket}": ${error.message}`
    )
  }
}
