/* eslint-disable jest/no-commented-out-tests */

// import { Readable } from 'stream'
import {
  getFiles,
  getFile,
  moveFile,
  failedBucketPath,
  processingBucketPath,
  completedBucketPath,
  filterFilesByDate
} from './s3.js'

describe('S3 Buckets', () => {
  describe('Get all files from s3 bucket', () => {
    let mockS3Client

    beforeEach(() => {
      mockS3Client = {
        send: jest.fn()
      }
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    describe('Get files from s3 bucket', () => {
      test('should return array of file objects when bucket has files in root', async () => {
        const mockResponse = {
          Contents: [
            { Key: 'file1.txt' },
            { Key: 'file2.txt' },
            { Key: 'file3.txt' }
          ]
        }
        mockS3Client.send.mockResolvedValue(mockResponse)

        const result = await getFiles(mockS3Client, 'test-bucket')

        expect(result).toEqual([
          { Key: 'file1.txt' },
          { Key: 'file2.txt' },
          { Key: 'file3.txt' }
        ])
        expect(mockS3Client.send).toHaveBeenCalledTimes(1)
        expect(mockS3Client.send.mock.calls[0][0]).toMatchObject({
          input: {
            Bucket: 'test-bucket',
            Delimiter: '/'
          }
        })
      })

      test('should return single file object when bucket has one file', async () => {
        const mockResponse = {
          Contents: [{ Key: 'single-file.txt' }]
        }
        mockS3Client.send.mockResolvedValue(mockResponse)

        const result = await getFiles(mockS3Client, 'test-bucket')

        expect(result).toEqual([{ Key: 'single-file.txt' }])
      })

      test('should filter out objects with undefined keys', async () => {
        const mockResponse = {
          Contents: [
            { Key: 'file1.txt' },
            { Key: undefined },
            { Key: 'file2.txt' },
            { Key: undefined }
          ]
        }
        mockS3Client.send.mockResolvedValue(mockResponse)

        const result = await getFiles(mockS3Client, 'test-bucket')

        expect(result).toEqual([{ Key: 'file1.txt' }, { Key: 'file2.txt' }])
      })

      test('should handle files with special characters in keys', async () => {
        const mockResponse = {
          Contents: [
            { Key: 'file with spaces.txt' },
            { Key: 'file-with-dashes.txt' },
            { Key: 'file_with_underscores.txt' }
          ]
        }
        mockS3Client.send.mockResolvedValue(mockResponse)

        const result = await getFiles(mockS3Client, 'test-bucket')

        expect(result).toEqual([
          { Key: 'file with spaces.txt' },
          { Key: 'file-with-dashes.txt' },
          { Key: 'file_with_underscores.txt' }
        ])
      })

      test('should only return root-level files, not files in subfolders', async () => {
        const mockResponse = {
          Contents: [
            { Key: 'root-file.txt' },
            { Key: 'another-root-file.txt' }
          ],
          CommonPrefixes: [{ Prefix: 'folder/' }, { Prefix: 'subfolder/' }]
        }
        mockS3Client.send.mockResolvedValue(mockResponse)

        const result = await getFiles(mockS3Client, 'test-bucket')

        expect(result).toEqual([
          { Key: 'root-file.txt' },
          { Key: 'another-root-file.txt' }
        ])
      })
    })

    describe('Empty bucket scenarios', () => {
      test('should return empty array when bucket has no contents', async () => {
        const mockResponse = {
          Contents: []
        }
        mockS3Client.send.mockResolvedValue(mockResponse)

        const result = await getFiles(mockS3Client, 'test-bucket')

        expect(result).toEqual([])
      })

      test('should return empty array when Contents is undefined', async () => {
        const mockResponse = {}
        mockS3Client.send.mockResolvedValue(mockResponse)

        const result = await getFiles(mockS3Client, 'test-bucket')

        expect(result).toEqual([])
      })

      test('should return empty array when Contents is null', async () => {
        const mockResponse = {
          Contents: null
        }
        mockS3Client.send.mockResolvedValue(mockResponse)

        const result = await getFiles(mockS3Client, 'test-bucket')

        expect(result).toEqual([])
      })
    })

    describe('Error handling', () => {
      test('should throw error with bucket name when S3 call fails', async () => {
        const s3Error = new Error('Access Denied')
        mockS3Client.send.mockRejectedValue(s3Error)

        await expect(getFiles(mockS3Client, 'test-bucket')).rejects.toThrow(
          'Failed to list files from S3 bucket "test-bucket": Access Denied'
        )
      })

      test('should throw error when S3 returns network error', async () => {
        const networkError = new Error('Network timeout')
        mockS3Client.send.mockRejectedValue(networkError)

        await expect(getFiles(mockS3Client, 'my-bucket')).rejects.toThrow(
          'Failed to list files from S3 bucket "my-bucket": Network timeout'
        )
      })

      test('should throw error when bucket does not exist', async () => {
        const noSuchBucketError = new Error('NoSuchBucket')
        mockS3Client.send.mockRejectedValue(noSuchBucketError)

        await expect(
          getFiles(mockS3Client, 'non-existent-bucket')
        ).rejects.toThrow(
          'Failed to list files from S3 bucket "non-existent-bucket": NoSuchBucket'
        )
      })

      test('should throw error with empty message when error has no message', async () => {
        const errorWithoutMessage = new Error()
        errorWithoutMessage.message = ''
        mockS3Client.send.mockRejectedValue(errorWithoutMessage)

        await expect(getFiles(mockS3Client, 'test-bucket')).rejects.toThrow(
          'Failed to list files from S3 bucket "test-bucket": '
        )
      })
    })
  })

  describe('Get file from s3 bucket', () => {
    let mockS3Client

    beforeEach(() => {
      mockS3Client = {
        send: jest.fn()
      }
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    // const createMockStream = (content) => {
    //   const stream = new Readable()
    //   stream.push(content)
    //   stream.push(null)
    //   return stream
    // }

    // const createMockResponse = (content) => {
    //   return {
    //     Body: {
    //       transformToWebStream: jest
    //         .fn()
    //         .mockResolvedValue(createMockStream(content))
    //     }
    //   }
    // }

    // eslint-disable-next-line jest/no-disabled-tests
    // describe('Get file from s3 bucket', () => {
    //   test('should return file content as readable stream', async () => {
    //     const content = 'test'
    //     const mockResponse = createMockResponse(content)
    //     mockS3Client.send.mockResolvedValue(mockResponse)

    //     const result = await getFile(mockS3Client, 'test-bucket', 'file.txt')

    //     expect(mockS3Client.send).toHaveBeenCalledTimes(1)
    //     expect(mockS3Client.send.mock.calls[0][0]).toMatchObject({
    //       input: {
    //         Bucket: 'test-bucket',
    //         Key: 'file.txt'
    //       }
    //     })
    //     expect(result).toBeInstanceOf(Readable)
    //   })
    // })

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

  describe('Move file in s3 bucket', () => {
    let mockS3Client

    beforeEach(() => {
      mockS3Client = {
        send: jest.fn()
      }
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    const createMockCopyResult = () => ({
      CopyObjectResult: {
        ETag: '"abc123"',
        LastModified: new Date('2025-01-01T00:00:00.000Z')
      }
    })

    const createMockDeleteResult = () => ({
      DeleteMarker: false,
      VersionId: 'version123'
    })

    describe('Move file within bucket', () => {
      test('should successfully move file within same bucket', async () => {
        const mockCopyResult = createMockCopyResult()
        const mockDeleteResult = createMockDeleteResult()

        mockS3Client.send
          .mockResolvedValueOnce(mockCopyResult)
          .mockResolvedValueOnce(mockDeleteResult)

        const result = await moveFile(
          mockS3Client,
          'my-bucket',
          'source-file.txt',
          'dest-file.txt'
        )

        expect(result.success).toBe(true)
        expect(result.message).toBe(
          'File moved from my-bucket/source-file.txt to my-bucket/dest-file.txt'
        )
        expect(result.copyResult).toEqual(mockCopyResult)
        expect(result.deleteResult).toEqual(mockDeleteResult)
        expect(mockS3Client.send).toHaveBeenCalledTimes(2)
      })

      test('should call copy command with correct parameters', async () => {
        const mockCopyResult = createMockCopyResult()
        const mockDeleteResult = createMockDeleteResult()

        mockS3Client.send
          .mockResolvedValueOnce(mockCopyResult)
          .mockResolvedValueOnce(mockDeleteResult)

        await moveFile(
          mockS3Client,
          'my-bucket',
          'path/to/file.txt',
          'new/path/file.txt'
        )

        expect(mockS3Client.send.mock.calls[0][0]).toMatchObject({
          input: {
            CopySource: 'my-bucket/path/to/file.txt',
            Bucket: 'my-bucket',
            Key: 'new/path/file.txt'
          }
        })
      })

      test('should call delete command with correct parameters', async () => {
        const mockCopyResult = createMockCopyResult()
        const mockDeleteResult = createMockDeleteResult()

        mockS3Client.send
          .mockResolvedValueOnce(mockCopyResult)
          .mockResolvedValueOnce(mockDeleteResult)

        await moveFile(
          mockS3Client,
          'my-bucket',
          'path/to/file.txt',
          'new/path/file.txt'
        )

        expect(mockS3Client.send.mock.calls[1][0]).toMatchObject({
          input: {
            Bucket: 'my-bucket',
            Key: 'path/to/file.txt'
          }
        })
      })

      test('should move file to different path within same bucket', async () => {
        const mockCopyResult = createMockCopyResult()
        const mockDeleteResult = createMockDeleteResult()

        mockS3Client.send
          .mockResolvedValueOnce(mockCopyResult)
          .mockResolvedValueOnce(mockDeleteResult)

        const result = await moveFile(
          mockS3Client,
          'my-bucket',
          'old-path/file.txt',
          'new-path/file.txt'
        )

        expect(result.success).toBe(true)
        expect(result.message).toBe(
          'File moved from my-bucket/old-path/file.txt to my-bucket/new-path/file.txt'
        )
      })

      test('should handle files with special characters in keys', async () => {
        const mockCopyResult = createMockCopyResult()
        const mockDeleteResult = createMockDeleteResult()

        mockS3Client.send
          .mockResolvedValueOnce(mockCopyResult)
          .mockResolvedValueOnce(mockDeleteResult)

        const result = await moveFile(
          mockS3Client,
          'my-bucket',
          'file with spaces.txt',
          'file-with-dashes_and_underscores.txt'
        )

        expect(result.success).toBe(true)
        expect(mockS3Client.send.mock.calls[0][0]).toMatchObject({
          input: {
            CopySource: 'my-bucket/file with spaces.txt'
          }
        })
      })

      test('should handle nested folder paths', async () => {
        const mockCopyResult = createMockCopyResult()
        const mockDeleteResult = createMockDeleteResult()

        mockS3Client.send
          .mockResolvedValueOnce(mockCopyResult)
          .mockResolvedValueOnce(mockDeleteResult)

        const result = await moveFile(
          mockS3Client,
          'my-bucket',
          'folder/subfolder/deep/file.txt',
          'archived/2025/01/file.txt'
        )

        expect(result.success).toBe(true)
        expect(result.message).toBe(
          'File moved from my-bucket/folder/subfolder/deep/file.txt to my-bucket/archived/2025/01/file.txt'
        )
      })
    })

    describe('Error handling', () => {
      test('should throw error when copy operation fails', async () => {
        const copyError = new Error('Access Denied')
        mockS3Client.send.mockRejectedValue(copyError)

        await expect(
          moveFile(
            mockS3Client,
            'my-bucket',
            'source-file.txt',
            'dest-file.txt'
          )
        ).rejects.toThrow(
          'Failed to move file from my-bucket/source-file.txt to my-bucket/dest-file.txt: Access Denied'
        )

        expect(mockS3Client.send).toHaveBeenCalledTimes(1)
      })

      test('should throw error when delete operation fails', async () => {
        const mockCopyResult = createMockCopyResult()
        const deleteError = new Error('Delete failed')

        mockS3Client.send
          .mockResolvedValueOnce(mockCopyResult)
          .mockRejectedValueOnce(deleteError)

        await expect(
          moveFile(
            mockS3Client,
            'my-bucket',
            'source-file.txt',
            'dest-file.txt'
          )
        ).rejects.toThrow(
          'Failed to move file from my-bucket/source-file.txt to my-bucket/dest-file.txt: Delete failed'
        )

        expect(mockS3Client.send).toHaveBeenCalledTimes(2)
      })

      test('should throw error when source file does not exist', async () => {
        const noSuchKeyError = new Error('NoSuchKey')
        mockS3Client.send.mockRejectedValue(noSuchKeyError)

        await expect(
          moveFile(mockS3Client, 'my-bucket', 'missing.txt', 'destination.txt')
        ).rejects.toThrow(
          'Failed to move file from my-bucket/missing.txt to my-bucket/destination.txt: NoSuchKey'
        )
      })

      test('should throw error when bucket does not exist', async () => {
        const noSuchBucketError = new Error('NoSuchBucket')
        mockS3Client.send.mockRejectedValue(noSuchBucketError)

        await expect(
          moveFile(
            mockS3Client,
            'non-existent-bucket',
            'source-file.txt',
            'dest-file.txt'
          )
        ).rejects.toThrow(
          'Failed to move file from non-existent-bucket/source-file.txt to non-existent-bucket/dest-file.txt: NoSuchBucket'
        )
      })

      test('should handle network timeout errors', async () => {
        const timeoutError = new Error('Connection timeout')
        mockS3Client.send.mockRejectedValue(timeoutError)

        await expect(
          moveFile(
            mockS3Client,
            'my-bucket',
            'source-file.txt',
            'dest-file.txt'
          )
        ).rejects.toThrow(
          'Failed to move file from my-bucket/source-file.txt to my-bucket/dest-file.txt: Connection timeout'
        )
      })

      test('should throw error with empty message when error has no message', async () => {
        const errorWithoutMessage = new Error()
        errorWithoutMessage.message = ''
        mockS3Client.send.mockRejectedValue(errorWithoutMessage)

        await expect(
          moveFile(
            mockS3Client,
            'my-bucket',
            'source-file.txt',
            'dest-file.txt'
          )
        ).rejects.toThrow(
          'Failed to move file from my-bucket/source-file.txt to my-bucket/dest-file.txt: '
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

    describe('processingBucketPath', () => {
      test('should prepend processing/ to simple filename', () => {
        expect(processingBucketPath('parcels/file.txt')).toBe(
          'processing/parcels/file.txt'
        )
      })
    })

    describe('completedBucketPath', () => {
      test('should prepend completed/ to simple filename', () => {
        expect(completedBucketPath('parcels/file.txt')).toBe(
          'completed/parcels/file.txt'
        )
      })
    })
  })

  describe('Filter files by date', () => {
    describe('Date filtering with various cutoff times', () => {
      test('should return files older than cutoff time', () => {
        const oldDate = new Date()
        oldDate.setMinutes(oldDate.getMinutes() - 10)

        const items = [
          { Key: 'old-file.txt', LastModified: oldDate },
          { Key: 'another-old-file.txt', LastModified: oldDate }
        ]

        const result = filterFilesByDate(items, 5)

        expect(result).toHaveLength(2)
        expect(result).toEqual([
          { Key: 'old-file.txt', LastModified: oldDate },
          { Key: 'another-old-file.txt', LastModified: oldDate }
        ])
      })

      test('should filter out files newer than cutoff time', () => {
        const recentDate = new Date()
        recentDate.setMinutes(recentDate.getMinutes() - 2)

        const items = [{ Key: 'recent-file.txt', LastModified: recentDate }]

        const result = filterFilesByDate(items, 5)

        expect(result).toEqual([])
      })

      test('should filter mixed old and new files correctly', () => {
        const oldDate = new Date()
        oldDate.setMinutes(oldDate.getMinutes() - 10)

        const recentDate = new Date()
        recentDate.setMinutes(recentDate.getMinutes() - 2)

        const items = [
          { Key: 'old-file-1.txt', LastModified: oldDate },
          { Key: 'recent-file.txt', LastModified: recentDate },
          { Key: 'old-file-2.txt', LastModified: oldDate }
        ]

        const result = filterFilesByDate(items, 5)

        expect(result).toHaveLength(2)
        expect(result[0].Key).toBe('old-file-1.txt')
        expect(result[1].Key).toBe('old-file-2.txt')
      })

      test('should include files exactly at cutoff time', () => {
        const exactCutoffDate = new Date()
        exactCutoffDate.setMinutes(exactCutoffDate.getMinutes() - 5)

        const items = [
          { Key: 'exact-cutoff-file.txt', LastModified: exactCutoffDate }
        ]

        const result = filterFilesByDate(items, 5)

        expect(result).toHaveLength(1)
        expect(result[0].Key).toBe('exact-cutoff-file.txt')
      })

      test('should handle different minute values', () => {
        const oldDate = new Date()
        oldDate.setMinutes(oldDate.getMinutes() - 60)

        const items = [{ Key: 'very-old-file.txt', LastModified: oldDate }]

        const result = filterFilesByDate(items, 30)

        expect(result).toHaveLength(1)
        expect(result[0].Key).toBe('very-old-file.txt')
      })

      test('should return empty array when all files are too recent', () => {
        const recentDate = new Date()
        recentDate.setSeconds(recentDate.getSeconds() - 30)

        const items = [
          { Key: 'recent-file-1.txt', LastModified: recentDate },
          { Key: 'recent-file-2.txt', LastModified: recentDate }
        ]

        const result = filterFilesByDate(items, 5)

        expect(result).toEqual([])
      })

      test('should return all items when minutes is 0', () => {
        const pastDate = new Date()
        pastDate.setMinutes(pastDate.getMinutes() - 1)

        const futureDate = new Date()
        futureDate.setMinutes(futureDate.getMinutes() + 10)

        const items = [
          { Key: 'past-file.txt', LastModified: pastDate },
          { Key: 'future-file.txt', LastModified: futureDate }
        ]

        const result = filterFilesByDate(items, 0)

        expect(result).toHaveLength(2)
        expect(result).toEqual(items)
      })

      test('should return all items when minutes is not provided', () => {
        const pastDate = new Date()
        pastDate.setMinutes(pastDate.getMinutes() - 1)

        const futureDate = new Date()
        futureDate.setMinutes(futureDate.getMinutes() + 10)

        const items = [
          { Key: 'past-file.txt', LastModified: pastDate },
          { Key: 'future-file.txt', LastModified: futureDate }
        ]

        const result = filterFilesByDate(items)

        expect(result).toHaveLength(2)
        expect(result).toEqual(items)
      })
    })

    describe('Edge cases and error handling', () => {
      test('should return empty array when items is undefined', () => {
        const result = filterFilesByDate(undefined, 5)

        expect(result).toEqual([])
      })

      test('should return empty array when items is null', () => {
        const result = filterFilesByDate(null, 5)

        expect(result).toEqual([])
      })

      test('should return empty array when items is empty array', () => {
        const result = filterFilesByDate([], 5)

        expect(result).toEqual([])
      })

      test('should filter out items without LastModified property', () => {
        const oldDate = new Date()
        oldDate.setMinutes(oldDate.getMinutes() - 10)

        const items = [
          { Key: 'file-with-date.txt', LastModified: oldDate },
          { Key: 'file-without-date.txt' },
          { Key: 'another-file-with-date.txt', LastModified: oldDate }
        ]

        const result = filterFilesByDate(items, 5)

        expect(result).toHaveLength(2)
        expect(result[0].Key).toBe('file-with-date.txt')
        expect(result[1].Key).toBe('another-file-with-date.txt')
      })

      test('should filter out items with null LastModified', () => {
        const oldDate = new Date()
        oldDate.setMinutes(oldDate.getMinutes() - 10)

        const items = [
          { Key: 'file-with-date.txt', LastModified: oldDate },
          { Key: 'file-with-null-date.txt', LastModified: null }
        ]

        const result = filterFilesByDate(items, 5)

        expect(result).toHaveLength(1)
        expect(result[0].Key).toBe('file-with-date.txt')
      })

      test('should filter out items with undefined LastModified', () => {
        const oldDate = new Date()
        oldDate.setMinutes(oldDate.getMinutes() - 10)

        const items = [
          { Key: 'file-with-date.txt', LastModified: oldDate },
          { Key: 'file-with-undefined-date.txt', LastModified: undefined }
        ]

        const result = filterFilesByDate(items, 5)

        expect(result).toHaveLength(1)
        expect(result[0].Key).toBe('file-with-date.txt')
      })
    })

    describe('Real-world scenarios', () => {
      test('should handle files with different timestamps', () => {
        const now = new Date()

        const veryOldDate = new Date(now)
        veryOldDate.setHours(veryOldDate.getHours() - 2)

        const oldDate = new Date(now)
        oldDate.setMinutes(oldDate.getMinutes() - 10)

        const recentDate = new Date(now)
        recentDate.setMinutes(recentDate.getMinutes() - 2)

        const items = [
          { Key: 'very-old-file.txt', LastModified: veryOldDate },
          { Key: 'old-file.txt', LastModified: oldDate },
          { Key: 'recent-file.txt', LastModified: recentDate }
        ]

        const result = filterFilesByDate(items, 5)

        expect(result).toHaveLength(2)
        expect(result[0].Key).toBe('very-old-file.txt')
        expect(result[1].Key).toBe('old-file.txt')
      })

      test('should preserve all file properties in returned objects', () => {
        const oldDate = new Date()
        oldDate.setMinutes(oldDate.getMinutes() - 10)

        const items = [
          {
            Key: 'file.txt',
            LastModified: oldDate,
            Size: 1024,
            ETag: '"abc123"',
            StorageClass: 'STANDARD'
          }
        ]

        const result = filterFilesByDate(items, 5)

        expect(result).toHaveLength(1)
        expect(result[0]).toEqual({
          Key: 'file.txt',
          LastModified: oldDate,
          Size: 1024,
          ETag: '"abc123"',
          StorageClass: 'STANDARD'
        })
      })

      test('should handle large arrays of files', () => {
        const oldDate = new Date()
        oldDate.setMinutes(oldDate.getMinutes() - 10)

        const items = Array.from({ length: 100 }, (_, i) => ({
          Key: `file-${i}.txt`,
          LastModified: oldDate
        }))

        const result = filterFilesByDate(items, 5)

        expect(result).toHaveLength(100)
      })

      test('should handle files with nested folder paths', () => {
        const oldDate = new Date()
        oldDate.setMinutes(oldDate.getMinutes() - 10)

        const items = [
          {
            Key: 'folder/subfolder/deep/file.txt',
            LastModified: oldDate
          },
          {
            Key: 'archived/2025/01/file.txt',
            LastModified: oldDate
          }
        ]

        const result = filterFilesByDate(items, 5)

        expect(result).toHaveLength(2)
        expect(result[0].Key).toBe('folder/subfolder/deep/file.txt')
        expect(result[1].Key).toBe('archived/2025/01/file.txt')
      })
    })
  })
})
