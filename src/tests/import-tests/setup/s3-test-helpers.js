import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CreateBucketCommand,
  HeadBucketCommand
} from '@aws-sdk/client-s3'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'url'
import { S3_CONFIG } from '../../db-tests/setup/test-config.js'
import { config } from '~/src/config/index.js'
import { createZipFromFixture } from './zip.js'

/**
 * Create S3 client for testing
 * @returns {S3Client}
 */
export function createTestS3Client() {
  return new S3Client({
    region: S3_CONFIG.region,
    endpoint: config.get('s3.endpoint'),
    forcePathStyle: true,
    credentials: S3_CONFIG.credentials
  })
}

/**
 * Ensure the test bucket exists
 * @param {S3Client} s3Client
 * @param {string} bucket
 */
export async function ensureBucketExists(s3Client, bucket = S3_CONFIG.bucket) {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }))
  } catch (error) {
    if (error.name === 'NotFound') {
      await s3Client.send(new CreateBucketCommand({ Bucket: bucket }))
      /* eslint-disable no-console */
      console.log(`Created test bucket: ${bucket}`)
    } else {
      throw error
    }
  }
}

/**
 * Upload a file to S3 test bucket
 * @param {S3Client} s3Client
 * @param {string} filename - Name of the file in S3
 * @param {string|Buffer} content - File content (string or Buffer)
 * @param {string} bucket
 * @param {string} contentType - MIME type of the file
 */
export async function uploadTestFile(
  s3Client,
  filename,
  content,
  bucket = S3_CONFIG.bucket,
  contentType = 'text/csv'
) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: filename,
    Body: content,
    ContentType: contentType
  })

  await s3Client.send(command)
}

/**
 * Upload a file from fixtures directory
 * @param {S3Client} s3Client
 * @param {string} fixtureFilename - Name of the fixture file
 * @param {string} s3Filename - Optional: different name in S3 (defaults to fixture filename)
 * @param {string} bucket
 * @param {string} contentType - MIME type of the file
 */
export async function uploadFixtureFile(
  s3Client,
  fixtureFilename,
  s3Filename = fixtureFilename,
  bucket = S3_CONFIG.bucket,
  contentType = 'text/csv'
) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const fixturePath = path.resolve(__dirname, '../fixtures', fixtureFilename)

  const content = await readFile(fixturePath)
  await uploadTestFile(s3Client, s3Filename, content, bucket, contentType)
}

/**
 * List all files in the test bucket
 * @param {S3Client} s3Client
 * @param {string} bucket
 * @returns {Promise<string[]>} Array of file keys
 */
export async function listTestFiles(s3Client, bucket = S3_CONFIG.bucket) {
  const command = new ListObjectsV2Command({ Bucket: bucket })
  const response = await s3Client.send(command)

  if (!response.Contents || response.Contents.length === 0) {
    return []
  }

  return response.Contents.map((item) => item.Key).filter(
    (key) => key !== undefined
  )
}

/**
 * Delete a file from the test bucket
 * @param {S3Client} s3Client
 * @param {string} filename
 * @param {string} bucket
 */
export async function deleteTestFile(
  s3Client,
  filename,
  bucket = S3_CONFIG.bucket
) {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: filename
  })

  await s3Client.send(command)
}

/**
 * Delete all files from the test bucket
 * @param {S3Client} s3Client
 * @param {string} bucket
 */
export async function clearTestBucket(s3Client, bucket = S3_CONFIG.bucket) {
  const files = await listTestFiles(s3Client, bucket)

  if (files.length === 0) {
    return
  }

  const command = new DeleteObjectsCommand({
    Bucket: bucket,
    Delete: {
      Objects: files.map((key) => ({ Key: key }))
    }
  })

  await s3Client.send(command)
}

/**
 *
 * @param {*} s3Client
 * @param {string | string[]} filenames
 * @param {*} bucket
 */
export async function deleteFiles(
  s3Client,
  filenames,
  bucket = S3_CONFIG.bucket
) {
  const files = Array.isArray(filenames) ? filenames : [filenames]
  const commands = files.map(
    (filename) =>
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: filename
      })
  )

  await s3Client.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: commands.map((command) => ({ Key: command.input.Key }))
      }
    })
  )
}

/**
 * Upload a fixture file to S3 as either a CSV or a zipped CSV,
 * determined by the file extension of the destination S3 key.
 * @param {S3Client} s3Client
 * @param {string} csvFixtureFilename - Name of the source CSV fixture file
 * @param {string} s3Key - Destination S3 key (determines upload type by extension)
 * @param {string} bucket
 * @returns {Promise<void>}
 */
export async function uploadLandDataFixture(
  s3Client,
  csvFixtureFilename,
  s3Key,
  bucket = S3_CONFIG.bucket
) {
  if (s3Key.endsWith('.zip')) {
    const zipBuffer = await createZipFromFixture(csvFixtureFilename)
    await uploadTestFile(s3Client, s3Key, zipBuffer, bucket, 'application/zip')
  } else {
    await uploadFixtureFile(s3Client, csvFixtureFilename, s3Key, bucket)
  }
}
