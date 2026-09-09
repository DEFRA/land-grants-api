import { vi } from 'vitest'
import { coordinateTransformCheck } from './coordinate-transform-check.js'
import { checkCoordinateTransform } from '~/src/features/vector-tiles/queries/checkCoordinateTransform.query.js'
import { metricsCounter } from '~/src/features/common/helpers/metrics.js'
import {
  TRANSFORM_CHECK_EXPECTED_LNG,
  TRANSFORM_CHECK_EXPECTED_LAT
} from '~/src/features/vector-tiles/constants/coordinate-systems.js'

vi.mock('~/src/features/vector-tiles/queries/checkCoordinateTransform.query.js')
vi.mock('~/src/features/common/helpers/metrics.js')

// The coordinates PostGIS returns when the OSTN15 grid is absent and PROJ falls
// back to a Helmert approximation, measured against postgis/postgis:16-3.4.
const HELMERT_FALLBACK_LNG = -2.61220595259018
const HELMERT_FALLBACK_LAT = 54.034422251119196

describe('coordinateTransformCheck', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }

  const buildServer = () => {
    const exposed = {}
    return {
      logger: mockLogger,
      postgresDb: { connect: vi.fn() },
      expose: vi.fn((key, value) => {
        exposed[key] = value
      }),
      exposed
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports accurate when the transform matches the OSTN15 reference', async () => {
    vi.mocked(checkCoordinateTransform).mockResolvedValue({
      lng: TRANSFORM_CHECK_EXPECTED_LNG,
      lat: TRANSFORM_CHECK_EXPECTED_LAT
    })

    const server = buildServer()
    coordinateTransformCheck.plugin.register(server)

    await expect(server.exposed.verifyCoordinateTransform()).resolves.toBe(true)
    expect(metricsCounter).not.toHaveBeenCalled()
  })

  it('reports accurate when the difference is within tolerance', async () => {
    vi.mocked(checkCoordinateTransform).mockResolvedValue({
      lng: TRANSFORM_CHECK_EXPECTED_LNG + 5e-7,
      lat: TRANSFORM_CHECK_EXPECTED_LAT - 5e-7
    })

    const server = buildServer()
    coordinateTransformCheck.plugin.register(server)

    await expect(server.exposed.verifyCoordinateTransform()).resolves.toBe(true)
  })

  it('reports inaccurate when PROJ has fallen back to a Helmert approximation', async () => {
    vi.mocked(checkCoordinateTransform).mockResolvedValue({
      lng: HELMERT_FALLBACK_LNG,
      lat: HELMERT_FALLBACK_LAT
    })

    const server = buildServer()
    coordinateTransformCheck.plugin.register(server)

    await expect(server.exposed.verifyCoordinateTransform()).resolves.toBe(
      false
    )
  })

  it('emits a metric when the transform is inaccurate', async () => {
    vi.mocked(checkCoordinateTransform).mockResolvedValue({
      lng: HELMERT_FALLBACK_LNG,
      lat: HELMERT_FALLBACK_LAT
    })

    const server = buildServer()
    coordinateTransformCheck.plugin.register(server)
    await server.exposed.verifyCoordinateTransform()

    expect(metricsCounter).toHaveBeenCalledWith(
      'coordinate_transform_inaccurate',
      1
    )
  })

  it('logs the actual and expected coordinates when the transform is inaccurate', async () => {
    vi.mocked(checkCoordinateTransform).mockResolvedValue({
      lng: HELMERT_FALLBACK_LNG,
      lat: HELMERT_FALLBACK_LAT
    })

    const server = buildServer()
    coordinateTransformCheck.plugin.register(server)
    await server.exposed.verifyCoordinateTransform()

    const [logData, message] = mockLogger.error.mock.calls[0]

    expect(logData.event).toMatchObject({
      category: 'database',
      action: 'Verify coordinate transform',
      type: 'error'
    })
    // The measured and expected coordinates have to reach the log, or an
    // operator seeing the alert has no way to tell how far out it is.
    expect(message).toContain(String(HELMERT_FALLBACK_LAT))
    expect(message).toContain(String(TRANSFORM_CHECK_EXPECTED_LAT))
  })

  // The fire-and-forget call in register() is the only thing that makes this
  // run in production, so assert it independently of the exposed function.
  it('runs the check on startup without anything calling the exposed function', () => {
    vi.mocked(checkCoordinateTransform).mockResolvedValue({
      lng: TRANSFORM_CHECK_EXPECTED_LNG,
      lat: TRANSFORM_CHECK_EXPECTED_LAT
    })

    coordinateTransformCheck.plugin.register(buildServer())

    expect(checkCoordinateTransform).toHaveBeenCalledTimes(1)
  })

  it('logs rather than throwing when the startup check fails', async () => {
    vi.mocked(checkCoordinateTransform).mockRejectedValue(
      new Error('Connect failed')
    )

    const server = buildServer()
    coordinateTransformCheck.plugin.register(server)

    // Let the floating promise from register() settle before asserting.
    await Promise.resolve()
    await Promise.resolve()

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Connect failed' })
      }),
      'Failed to verify coordinate transform on startup'
    )
  })
})
