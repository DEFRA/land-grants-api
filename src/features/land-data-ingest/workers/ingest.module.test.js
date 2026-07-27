import { importLandData } from './import-land-data.js'

const mockPostMessage = vi.fn()

vi.mock('node:worker_threads', () => ({
  parentPort: {
    postMessage: mockPostMessage
  }
}))

vi.mock('./import-land-data.js', () => ({
  importLandData: vi.fn()
}))

describe('Ingest Module', () => {
  describe('ingestLandData', () => {
    let ingestLandData

    beforeEach(async () => {
      vi.clearAllMocks()

      const module = await import('./ingest.module.js')
      ingestLandData = module.ingestLandData
    })

    it('should post success message on successful import', async () => {
      importLandData.mockResolvedValue('Land data imported successfully')

      await ingestLandData({
        taskId: 'task-1',
        data: {
          s3key: 'land_parcels/123/test.csv',
          filename: 'test.csv',
          ingestId: '123'
        }
      })

      expect(importLandData).toHaveBeenCalledWith({
        s3key: 'land_parcels/123/test.csv',
        filename: 'test.csv',
        ingestId: '123'
      })
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-1',
          success: true,
          result: 'Land data imported successfully'
        })
      )
    })

    it('should post failure message and rethrow when import fails', async () => {
      importLandData.mockRejectedValue(new Error('Ingest 123 not found'))

      await expect(
        ingestLandData({
          taskId: 'task-2',
          data: {
            s3key: 'land_parcels/123/test.csv',
            filename: 'test.csv',
            ingestId: '123'
          }
        })
      ).rejects.toThrow('Ingest 123 not found')

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-2',
          success: false,
          error: 'Ingest 123 not found'
        })
      )
    })

    it('should post failure message on S3 errors', async () => {
      importLandData.mockRejectedValue(new Error('S3 connection failed'))

      await expect(
        ingestLandData({
          taskId: 'task-3',
          data: { s3key: 'land_parcels/123/test.csv' }
        })
      ).rejects.toThrow('S3 connection failed')

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-3',
          success: false,
          error: 'S3 connection failed'
        })
      )
    })
  })
})
