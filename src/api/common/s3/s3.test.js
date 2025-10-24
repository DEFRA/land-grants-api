import { Readable } from 'stream'
import { getFiles, getFile } from './s3.js'

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

    describe('Get file from s3 bucket', () => {
      test('should return array of file keys when bucket has files', async () => {
        const mockResponse = {
          Contents: [
            { Key: 'file1.txt' },
            { Key: 'file2.txt' },
            { Key: 'folder/file3.txt' }
          ]
        }
        mockS3Client.send.mockResolvedValue(mockResponse)

        const result = await getFiles(mockS3Client, 'test-bucket')

        expect(result).toEqual(['file1.txt', 'file2.txt', 'folder/file3.txt'])
        expect(mockS3Client.send).toHaveBeenCalledTimes(1)
        expect(mockS3Client.send.mock.calls[0][0]).toMatchObject({
          input: {
            Bucket: 'test-bucket'
          }
        })
      })

      test('should return single file key when bucket has one file', async () => {
        const mockResponse = {
          Contents: [{ Key: 'single-file.txt' }]
        }
        mockS3Client.send.mockResolvedValue(mockResponse)

        const result = await getFiles(mockS3Client, 'test-bucket')

        expect(result).toEqual(['single-file.txt'])
      })

      test('should filter out undefined keys', async () => {
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

        expect(result).toEqual(['file1.txt', 'file2.txt'])
      })

      test('should handle files with special characters in keys', async () => {
        const mockResponse = {
          Contents: [
            { Key: 'file with spaces.txt' },
            { Key: 'file-with-dashes.txt' },
            { Key: 'file_with_underscores.txt' },
            { Key: 'folder/subfolder/file.txt' }
          ]
        }
        mockS3Client.send.mockResolvedValue(mockResponse)

        const result = await getFiles(mockS3Client, 'test-bucket')

        expect(result).toEqual([
          'file with spaces.txt',
          'file-with-dashes.txt',
          'file_with_underscores.txt',
          'folder/subfolder/file.txt'
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

    const createMockStream = (content) => {
      const stream = new Readable()
      stream.push(content)
      stream.push(null)
      return stream
    }

    describe('Get file from s3 bucket', () => {
      test('should return file content as string', async () => {
        const mockContent = 'Hello, World!'
        const mockStream = createMockStream(mockContent)
        const mockResponse = { Body: mockStream }
        mockS3Client.send.mockResolvedValue(mockResponse)

        const result = await getFile(mockS3Client, 'test-bucket', 'file.txt')

        expect(result).toBe(mockContent)
        expect(mockS3Client.send).toHaveBeenCalledTimes(1)
        expect(mockS3Client.send.mock.calls[0][0]).toMatchObject({
          input: {
            Bucket: 'test-bucket',
            Key: 'file.txt'
          }
        })
      })

      test('should return empty string for empty file', async () => {
        const mockStream = createMockStream('')
        const mockResponse = { Body: mockStream }
        mockS3Client.send.mockResolvedValue(mockResponse)

        const result = await getFile(mockS3Client, 'test-bucket', 'empty.txt')

        expect(result).toBe('')
      })

      test('should handle JSON file content', async () => {
        const jsonContent = JSON.stringify({ name: 'test', value: 123 })
        const mockStream = createMockStream(jsonContent)
        const mockResponse = { Body: mockStream }
        mockS3Client.send.mockResolvedValue(mockResponse)

        const result = await getFile(mockS3Client, 'test-bucket', 'data.json')

        expect(result).toBe(jsonContent)
        expect(JSON.parse(result)).toEqual({ name: 'test', value: 123 })
      })

      test('should handle CSV file content', async () => {
        const csvContent = 'name,age\nJohn,30\nJane,25'
        const mockStream = createMockStream(csvContent)
        const mockResponse = { Body: mockStream }
        mockS3Client.send.mockResolvedValue(mockResponse)

        const result = await getFile(mockS3Client, 'test-bucket', 'data.csv')

        expect(result).toBe(csvContent)
      })

      test('should handle file with special characters', async () => {
        const specialContent = 'Special: !@#$%^&*()_+-=[]{}|;:,.<>?'
        const mockStream = createMockStream(specialContent)
        const mockResponse = { Body: mockStream }
        mockS3Client.send.mockResolvedValue(mockResponse)

        const result = await getFile(mockS3Client, 'test-bucket', 'special.txt')

        expect(result).toBe(specialContent)
      })

      test('should handle multi-line content', async () => {
        const multilineContent = 'Line 1\nLine 2\nLine 3\nLine 4'
        const mockStream = createMockStream(multilineContent)
        const mockResponse = { Body: mockStream }
        mockS3Client.send.mockResolvedValue(mockResponse)

        const result = await getFile(mockS3Client, 'test-bucket', 'multi.txt')

        expect(result).toBe(multilineContent)
      })

      test('should handle UTF-8 encoded content', async () => {
        const utf8Content = 'Hello 世界 🌍'
        const mockStream = createMockStream(utf8Content)
        const mockResponse = { Body: mockStream }
        mockS3Client.send.mockResolvedValue(mockResponse)

        const result = await getFile(mockS3Client, 'test-bucket', 'utf8.txt')

        expect(result).toBe(utf8Content)
      })

      test('should handle large file content', async () => {
        const largeContent = 'x'.repeat(10000)
        const mockStream = createMockStream(largeContent)
        const mockResponse = { Body: mockStream }
        mockS3Client.send.mockResolvedValue(mockResponse)

        const result = await getFile(mockS3Client, 'test-bucket', 'large.txt')

        expect(result).toHaveLength(10000)
        expect(result).toBe(largeContent)
      })
    })

    describe('Stream handling', () => {
      test('should handle stream with multiple chunks', async () => {
        const stream = new Readable({
          read() {
            this.push('chunk1')
            this.push('chunk2')
            this.push('chunk3')
            this.push(null)
          }
        })
        const mockResponse = { Body: stream }
        mockS3Client.send.mockResolvedValue(mockResponse)

        const result = await getFile(mockS3Client, 'test-bucket', 'file.txt')

        expect(result).toBe('chunk1chunk2chunk3')
      })

      test('should handle stream with buffers', async () => {
        const stream = new Readable({
          read() {
            this.push(Buffer.from('Hello '))
            this.push(Buffer.from('World'))
            this.push(null)
          }
        })
        const mockResponse = { Body: stream }
        mockS3Client.send.mockResolvedValue(mockResponse)

        const result = await getFile(mockS3Client, 'test-bucket', 'file.txt')

        expect(result).toBe('Hello World')
      })
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

      test('should throw error when stream errors', async () => {
        const stream = new Readable({
          read() {
            this.destroy(new Error('Stream read error'))
          }
        })
        const mockResponse = { Body: stream }
        mockS3Client.send.mockResolvedValue(mockResponse)

        await expect(
          getFile(mockS3Client, 'test-bucket', 'file.txt')
        ).rejects.toThrow(
          'Failed to get file "file.txt" from S3 bucket "test-bucket": Stream read error'
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
})
