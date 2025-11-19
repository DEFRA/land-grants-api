import {
  ListObjectsV2Command,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3'

/**
 * Get files from S3 bucket root directory only (excludes subfolders)
 * @param {object} s3Client - S3 client instance
 * @param {string} bucket - S3 bucket name
 * @returns {Promise<object[]>} Array of file objects in root directory
 */
export async function getFiles(s3Client, bucket) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Delimiter: '/'
    })

    const response = await s3Client.send(command)

    if (!response.Contents || response.Contents.length === 0) {
      return []
    }

    return response.Contents.filter((item) => item.Key !== undefined)
  } catch (error) {
    throw new Error(
      `Failed to list files from S3 bucket "${bucket}": ${error.message}`
    )
  }
}

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
 * Moves a file from one S3 location to another
 * @param {object} s3Client - S3 client instance
 * @param {string} bucket - S3 bucket name
 * @param {string} sourceKey - Source object key (path)
 * @param {string} destinationKey - Destination object key (path)
 * @returns {Promise<object>} Result object with success status and details
 */
export async function moveFile(s3Client, bucket, sourceKey, destinationKey) {
  try {
    const copyCommand = new CopyObjectCommand({
      CopySource: `${bucket}/${sourceKey}`,
      Bucket: bucket,
      Key: destinationKey
    })

    const copyResult = await s3Client.send(copyCommand)

    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucket,
      Key: sourceKey
    })

    const deleteResult = await s3Client.send(deleteCommand)

    return {
      success: true,
      message: `File moved from ${bucket}/${sourceKey} to ${bucket}/${destinationKey}`,
      copyResult,
      deleteResult
    }
  } catch (error) {
    throw new Error(
      `Failed to move file from ${bucket}/${sourceKey} to ${bucket}/${destinationKey}: ${error.message}`
    )
  }
}

/**
 * Configure the S3 key for the failed resource
 * @param {string} key - The key of the resource
 * @returns {string} The configured S3 key
 */
export const failedBucketPath = (key) => {
  return `failed/${key}`
}

/**
 * Configure the S3 key for the processing resource
 * @param {string} key - The key of the resource
 * @returns {string} The configured S3 key
 */
export const processingBucketPath = (key) => {
  return `processing/${key}`
}

/**
 * Configure the S3 key for the completed resource
 * @param {string} key - The key of the resource
 * @returns {string} The configured S3 key
 */
export const completedBucketPath = (key) => {
  return `completed/${key}`
}

/**
 * Filter files by date
 * @param {object[]} items - The items to filter
 * @param {number} minutes - The number of minutes to filter files by
 * @returns {object[]} The filtered items
 */
export const filterFilesByDate = (items, minutes = 0) => {
  if (minutes === 0) {
    return items
  }

  const cutoffTime = new Date()
  cutoffTime.setMinutes(cutoffTime.getMinutes() - minutes)

  return (
    items?.filter((obj) => {
      return obj.LastModified && obj.LastModified <= cutoffTime
    }) || []
  )
}
