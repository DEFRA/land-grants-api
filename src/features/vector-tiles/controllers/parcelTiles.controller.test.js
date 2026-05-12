import Hapi from '@hapi/hapi'
import { vi } from 'vitest'
import { ParcelTilesController } from './parcelTiles.controller.js'
import { getParcelMvt } from '~/src/features/vector-tiles/queries/getParcelMvt.query.js'

vi.mock('~/src/features/vector-tiles/queries/getParcelMvt.query.js')

const mockGetParcelMvt = getParcelMvt

describe('ParcelTilesController', () => {
  const server = Hapi.server()

  const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }

  const mockPostgresDb = { connect: vi.fn() }

  beforeAll(async () => {
    server.decorate('request', 'logger', mockLogger)
    server.decorate('server', 'postgresDb', mockPostgresDb)
    await server.register([
      {
        plugin: {
          name: 'parcel-tiles-test',
          register: (s) => {
            s.route({
              method: 'POST',
              path: '/api/v1/parcel-tiles/{z}/{x}/{y}',
              handler: ParcelTilesController.handler,
              options: ParcelTilesController.options
            })
          }
        }
      }
    ])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the MVT buffer with the vendor content type', async () => {
    const tile = Buffer.from([0x1a, 0x05, 0x01, 0x02, 0x03])
    mockGetParcelMvt.mockResolvedValue(tile)

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/parcel-tiles/14/8084/5258',
      payload: { parcelIds: ['SD7547-4115'] }
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toBe(
      'application/vnd.mapbox-vector-tile'
    )
    expect(response.rawPayload.equals(tile)).toBe(true)

    expect(mockGetParcelMvt).toHaveBeenCalledWith(
      {
        z: 14,
        x: 8084,
        y: 5258,
        sheetIds: ['SD7547'],
        parcelKeys: ['4115']
      },
      mockPostgresDb,
      mockLogger
    )
  })

  it('returns an empty 200 response when no parcels intersect the tile', async () => {
    mockGetParcelMvt.mockResolvedValue(Buffer.alloc(0))

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/parcel-tiles/14/8084/5258',
      payload: { parcelIds: ['SD7547-4115'] }
    })

    expect(response.statusCode).toBe(200)
    expect(response.rawPayload.length).toBe(0)
  })

  it('returns 400 when a parcel id is malformed', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/parcel-tiles/14/8084/5258',
      payload: { parcelIds: ['not-an-id-format'] }
    })

    expect(response.statusCode).toBe(400)
    expect(mockGetParcelMvt).not.toHaveBeenCalled()
  })

  it('returns 400 when the tile coordinates are out of range for the zoom', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/parcel-tiles/2/4/0',
      payload: { parcelIds: ['SD7547-4115'] }
    })

    expect(response.statusCode).toBe(400)
    expect(mockGetParcelMvt).not.toHaveBeenCalled()
  })

  it('returns 500 when the query throws', async () => {
    mockGetParcelMvt.mockRejectedValue(new Error('boom'))

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/parcel-tiles/14/8084/5258',
      payload: { parcelIds: ['SD7547-4115'] }
    })

    expect(response.statusCode).toBe(500)
  })
})
