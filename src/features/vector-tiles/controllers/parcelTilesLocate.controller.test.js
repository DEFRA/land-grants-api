import Hapi from '@hapi/hapi'
import { vi } from 'vitest'
import { ParcelTilesLocateController } from './parcelTilesLocate.controller.js'
import { getParcelExtent } from '~/src/features/vector-tiles/queries/getParcelExtent.query.js'

vi.mock('~/src/features/vector-tiles/queries/getParcelExtent.query.js')

const mockGetParcelExtent = getParcelExtent

describe('ParcelTilesLocateController', () => {
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
          name: 'parcel-tiles-locate-test',
          register: (s) => {
            s.route({
              method: 'POST',
              path: '/api/v1/parcel-tiles/locate',
              handler: ParcelTilesLocateController.handler,
              options: ParcelTilesLocateController.options
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

  it('returns a tile that contains the requested parcels', async () => {
    mockGetParcelExtent.mockResolvedValue({
      foundCount: 1,
      bbox: {
        xmin: -200_000,
        ymin: 6_800_000,
        xmax: -199_950,
        ymax: 6_800_050
      }
    })

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/parcel-tiles/locate',
      payload: { parcelIds: ['SD7547-4115'] }
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.payload)
    expect(body.message).toBe('success')
    expect(body.tile).toEqual({
      z: expect.any(Number),
      x: expect.any(Number),
      y: expect.any(Number)
    })
    expect(mockGetParcelExtent).toHaveBeenCalledWith(
      { sheetIds: ['SD7547'], parcelKeys: ['4115'] },
      mockPostgresDb,
      mockLogger
    )
  })

  it('returns 404 when no parcels matched', async () => {
    mockGetParcelExtent.mockResolvedValue({ foundCount: 0, bbox: null })

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/parcel-tiles/locate',
      payload: { parcelIds: ['SD7547-4115'] }
    })

    expect(response.statusCode).toBe(404)
  })

  it('returns 400 when a parcel id is malformed', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/parcel-tiles/locate',
      payload: { parcelIds: ['not-an-id-format'] }
    })

    expect(response.statusCode).toBe(400)
    expect(mockGetParcelExtent).not.toHaveBeenCalled()
  })

  it('returns 400 when parcelIds is empty', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/parcel-tiles/locate',
      payload: { parcelIds: [] }
    })

    expect(response.statusCode).toBe(400)
    expect(mockGetParcelExtent).not.toHaveBeenCalled()
  })

  it('returns 500 when the extent query throws', async () => {
    mockGetParcelExtent.mockRejectedValue(new Error('boom'))

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/parcel-tiles/locate',
      payload: { parcelIds: ['SD7547-4115'] }
    })

    expect(response.statusCode).toBe(500)
  })
})
