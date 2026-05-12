import {
  configBrokerCache,
  createConfigBrokerCache
} from '~/src/features/common/plugins/config-broker-cache.js'
import { vi } from 'vitest'

const { mockGetAllFiles, mockGetFile } = vi.hoisted(() => ({
  mockGetAllFiles: vi.fn(),
  mockGetFile: vi.fn()
}))

vi.mock('~/src/config/index.js', () => ({
  config: {
    get: vi.fn((key) =>
      key === 's3.configBrokerBucket' ? 'config-broker-bucket' : undefined
    )
  }
}))

vi.mock('../s3/s3.js', () => ({
  getAllFiles: mockGetAllFiles,
  getFile: mockGetFile
}))

/**
 * @param {unknown} value - Value to JSON.stringify into stream chunks
 * @returns {{ Body: Iterable<Buffer> }} S3-like getObject response
 */
function s3BodyFromJson(value) {
  return {
    Body: (function* () {
      yield Buffer.from(JSON.stringify(value))
    })()
  }
}

describe('#configBrokerCache', () => {
  let mockServer
  let mockLogger
  const mockS3 = {}

  beforeEach(() => {
    vi.clearAllMocks()
    mockLogger = {
      info: vi.fn()
    }
    mockServer = {
      s3: mockS3,
      app: {},
      logger: mockLogger
    }
  })

  test('Should have the correct plugin name', () => {
    expect(configBrokerCache.plugin.name).toBe('configBrokerCache')
  })

  test('Should have the correct plugin version', () => {
    expect(configBrokerCache.plugin.version).toBe('0.1.0')
  })

  test('Should register configBrokerCache on server.app and log file count', async () => {
    mockGetAllFiles.mockResolvedValue([{ Key: 'a.json' }, { Key: 'b.json' }])
    mockGetFile
      .mockResolvedValueOnce(s3BodyFromJson({ id: 1 }))
      .mockResolvedValueOnce(s3BodyFromJson({ id: 2 }))

    await configBrokerCache.plugin.register(mockServer)

    expect(mockGetAllFiles).toHaveBeenCalledWith(mockS3, 'config-broker-bucket')
    expect(mockGetFile).toHaveBeenNthCalledWith(
      1,
      mockS3,
      'config-broker-bucket',
      'a.json'
    )
    expect(mockGetFile).toHaveBeenNthCalledWith(
      2,
      mockS3,
      'config-broker-bucket',
      'b.json'
    )
    expect(mockServer.app.configBrokerCache).toEqual([{ id: 1 }, { id: 2 }])
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Config cache loaded: 2 file(s)'
    )
  })
})

describe('#createConfigBrokerCache', () => {
  const mockS3 = {}

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('Should return empty array when bucket has no files', async () => {
    mockGetAllFiles.mockResolvedValue([])

    const result = await createConfigBrokerCache(mockS3)

    expect(result).toEqual([])
    expect(mockGetFile).not.toHaveBeenCalled()
  })

  test('Should skip S3 objects without Key', async () => {
    mockGetAllFiles.mockResolvedValue([{}, { Key: 'only.json' }])
    mockGetFile.mockResolvedValueOnce(s3BodyFromJson({ ok: true }))

    const result = await createConfigBrokerCache(mockS3)

    expect(mockGetFile).toHaveBeenCalledTimes(1)
    expect(result).toEqual([{ ok: true }])
  })

  test('Should push null when body is not valid JSON', async () => {
    mockGetAllFiles.mockResolvedValue([{ Key: 'bad.json' }])
    mockGetFile.mockResolvedValueOnce({
      Body: (function* () {
        yield Buffer.from('not-json')
      })()
    })

    const result = await createConfigBrokerCache(mockS3)

    expect(result).toEqual([null])
  })
})
