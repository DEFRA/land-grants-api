import { statistics } from './statistics.js';
import { vi } from 'vitest';
import { config } from '~/src/config/index.js';

const { mockGetStats, mockMetricsCounter, mockWithTaskLock } = vi.hoisted(
  () => ({
    mockGetStats: vi.fn(),
    mockMetricsCounter: vi.fn(),
    mockWithTaskLock: vi.fn((pool, taskName, fn) =>
      fn().then((r) => ({ acquired: true, result: r }))
    )
  })
);

vi.mock('~/src/features/statistics/queries/stats.query.js', () => ({
  getStats: mockGetStats
}));

vi.mock('~/src/features/common/helpers/metrics.js', () => ({
  metricsCounter: mockMetricsCounter
}));

vi.mock('~/src/features/common/helpers/task-lock.js', () => ({
  withTaskLock: mockWithTaskLock
}));

describe('#statistics', () => {
  let mockServer;
  let mockLogger;
  let mockPostgresDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = {
      info: vi.fn(),
      error: vi.fn()
    };
    mockPostgresDb = {};
    mockServer = {
      logger: mockLogger,
      postgresDb: mockPostgresDb,
      expose: vi.fn(),
      events: {
        on: vi.fn()
      }
    };
    mockGetStats.mockResolvedValue({});

    config.set('taskLockTimeoutMinutes', 5);
  });

  test('Should have the correct plugin name', () => {
    expect(statistics.plugin.name).toBe('statistics');
  });

  test('Should have the correct plugin version', () => {
    expect(statistics.plugin.version).toBe('1.0.0');
  });

  test('Should get stats on startup', async () => {
    statistics.plugin.register(mockServer);

    await vi.waitFor(() => {
      expect(mockGetStats).toHaveBeenCalledWith(mockLogger, mockPostgresDb);
    });
  });

  test('Should log error when initial load fails', async () => {
    // make the initial getStats call reject
    mockGetStats.mockRejectedValueOnce(new Error('startup-failure'));

    statistics.plugin.register(mockServer);

    await vi.waitFor(() => {
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) }),
        'Failed to get stats on startup'
      );
    });
  });

  test('Should log info when stats job starts and completes successfully', async () => {
    statistics.plugin.register(mockServer);

    await vi.waitFor(() => {
      expect(mockLogger.info).toHaveBeenCalledWith('Running statistics counts');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Statistics counts job completed successfully'
      );
    });
  });

  test('should log stats with all counts', async () => {
    statistics.plugin.register(mockServer);

    const loadAndLogStats = mockServer.expose.mock.calls[0][1];

    await vi.waitFor(() => {
      expect(mockGetStats).toHaveBeenCalled();
    });

    mockLogger.info.mockClear();
    mockGetStats.mockClear();
    mockGetStats.mockResolvedValue({
      actionsCount: 10,
      unlinkedParcelsCount: 3,
      unlinkedCoversCount: 1
    });

    await loadAndLogStats();

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          category: 'database',
          type: 'info'
        })
      }),
      expect.stringContaining('Get stats')
    );

    const logMessage = mockLogger.info.mock.calls.find(
      ([, message]) =>
        typeof message === 'string' && message.includes('Get stats')
    )?.[1];

    expect(logMessage).toContain('actionsCount=10');
    expect(logMessage).toContain('unlinkedParcelsCount=3');
    expect(logMessage).toContain('unlinkedCoversCount=1');
  });

  test('Should emit unlinked_parcels_count and unlinked_covers_count metrics', async () => {
    mockGetStats.mockResolvedValue({
      unlinkedParcelsCount: 5,
      unlinkedCoversCount: 3
    });

    statistics.plugin.register(mockServer);

    await vi.waitFor(() => {
      expect(mockMetricsCounter).toHaveBeenCalledWith(
        'unlinked_parcels_count',
        5
      );
      expect(mockMetricsCounter).toHaveBeenCalledWith(
        'unlinked_covers_count',
        3
      );
    });
  });

  test('Should skip run and log when task lock is not acquired', async () => {
    mockWithTaskLock.mockResolvedValueOnce({ acquired: false });

    statistics.plugin.register(mockServer);

    await vi.waitFor(() => {
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Skipping statistics run; lock not acquired'
      );
    });
  });

  test('Should expose loadAndLogStats function', () => {
    statistics.plugin.register(mockServer);

    expect(mockServer.expose).toHaveBeenCalledWith(
      'loadAndLogStats',
      expect.any(Function)
    );
  });
});
