import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPostMessage } = vi.hoisted(() => ({
  mockPostMessage: vi.fn()
}));

vi.mock('node:worker_threads', () => ({
  parentPort: {
    postMessage: mockPostMessage
  }
}));

const { mockImportLandData } = vi.hoisted(() => ({
  mockImportLandData: vi.fn()
}));

vi.mock('./import-land-data.js', () => ({
  importLandData: mockImportLandData
}));

describe('Ingest Module', () => {
  describe('ingestLandData', () => {
    let ingestLandData;

    beforeEach(async () => {
      vi.clearAllMocks();
      mockPostMessage.mockClear();

      const module = await import('./ingest.module.js');
      ingestLandData = module.ingestLandData;
    });

    it('should post success message on successful import', async () => {
      mockImportLandData.mockResolvedValue({
        message: 'Land data imported successfully',
        dataChanged: true
      });

      await ingestLandData({
        taskId: 'task-1',
        data: {
          s3key: 'land_parcels/123/test.csv',
          filename: 'test.csv',
          ingestId: '123'
        }
      });

      expect(mockPostMessage).toHaveBeenCalledWith({
        taskId: 'task-1',
        completedAt: expect.any(String),
        success: true,
        result: 'Land data imported successfully',
        error: null,
        dataChanged: true
      });
    });

    it('should post failure message and rethrow when import fails', async () => {
      mockImportLandData.mockRejectedValue(new Error('Ingest 123 not found'));

      await expect(
        ingestLandData({
          taskId: 'task-2',
          data: {
            s3key: 'land_parcels/123/test.csv',
            filename: 'test.csv',
            ingestId: '123'
          }
        })
      ).rejects.toThrow('Ingest 123 not found');

      expect(mockPostMessage).toHaveBeenCalledWith({
        taskId: 'task-2',
        completedAt: expect.any(String),
        success: false,
        result: null,
        error: 'Ingest 123 not found',
        dataChanged: false
      });
    });

    it('should post failure message on S3 errors', async () => {
      mockImportLandData.mockRejectedValue(new Error('S3 connection failed'));

      await expect(
        ingestLandData({
          taskId: 'task-3',
          data: { s3key: 'land_parcels/123/test.csv' }
        })
      ).rejects.toThrow('S3 connection failed');

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-3',
          success: false,
          error: 'S3 connection failed'
        })
      );
    });
  });
});
