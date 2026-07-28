import { getFile, failedBucketPath } from './s3.js'

describe('S3 Buckets', () => {
  describe('Get file from s3 bucket', () => {
    let mockS3Client

    beforeEach(() => {
      mockS3Client = {
        send: vi.fn()
      }
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    describe('error handling', () => {
      test('should throw error with bucket and key when S3 call fails', async () => {
        const s3Error = new Error('Access Denied')
        mockS3Client.send.mockRejectedValue(s3Error)

        await expect(
          getFile(mockS3Client, 'test-bucket', 'file.txt')
        ).rejects.toThrow(
          'Failed to get file "file.txt" from S3 bucket "test-bucket": Access Denied'
        )
      })

      test('should throw error when file does not exist', async () => {
        const noSuchKeyError = new Error('NoSuchKey')
        mockS3Client.send.mockRejectedValue(noSuchKeyError)

        await expect(
          getFile(mockS3Client, 'test-bucket', 'missing.txt')
        ).rejects.toThrow(
          'Failed to get file "missing.txt" from S3 bucket "test-bucket": NoSuchKey'
        )
      })

      test('should throw error when bucket does not exist', async () => {
        const noSuchBucketError = new Error('NoSuchBucket')
        mockS3Client.send.mockRejectedValue(noSuchBucketError)

        await expect(
          getFile(mockS3Client, 'non-existent-bucket', 'file.txt')
        ).rejects.toThrow(
          'Failed to get file "file.txt" from S3 bucket "non-existent-bucket": NoSuchBucket'
        )
      })

      test('should handle network timeout errors', async () => {
        const timeoutError = new Error('Connection timeout')
        mockS3Client.send.mockRejectedValue(timeoutError)

        await expect(
          getFile(mockS3Client, 'test-bucket', 'file.txt')
        ).rejects.toThrow(
          'Failed to get file "file.txt" from S3 bucket "test-bucket": Connection timeout'
        )
      })

      test('should throw error with empty message when error has no message', async () => {
        const errorWithoutMessage = new Error()
        errorWithoutMessage.message = ''
        mockS3Client.send.mockRejectedValue(errorWithoutMessage)

        await expect(
          getFile(mockS3Client, 'test-bucket', 'file.txt')
        ).rejects.toThrow(
          'Failed to get file "file.txt" from S3 bucket "test-bucket": '
        )
      })
    })
  })

  describe('Bucket path helper functions', () => {
    describe('failedBucketPath', () => {
      test('should prepend failed/ to simple filename', () => {
        expect(failedBucketPath('parcels/file.txt')).toBe(
          'failed/parcels/file.txt'
        )
      })
    })
  })
})
