import Hapi from '@hapi/hapi'
import { land } from '../index.js'
import * as arcgisService from '~/src/services/arcgis.js'
import CatboxMemory from '@hapi/catbox-memory'

const originalFetch = global.fetch
const findLandParcelSpy = jest.spyOn(arcgisService, 'findLandParcel')
const fetchMoorlandIntersectionSpy = jest.spyOn(
  arcgisService,
  'fetchIntersection'
)

const mockLandParcelResponse = {
  features: [
    {
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-3.84215781948155, 50.2369627492092],
            [-3.84188557735844, 50.236368577696],
            [-3.84159762148358, 50.2357813103825],
            [-3.84215781948155, 50.2369627492092]
          ]
        ]
      },
      properties: {
        GEOM_AREA_SQM: 50000 // Parcel area for calculations
      }
    }
  ]
}

const mockMoorlandResponse = {
  features: [
    {
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-1.6372452684743, 53.4616238095816],
            [-1.63724434740339, 53.4616161198859],
            [-1.63723104195301, 53.4615013063136],
            [-1.6372452684743, 53.4616238095816]
          ]
        ]
      }
    },
    {
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-1.6352452684743, 53.4611238095816],
            [-1.63524434740339, 53.4611161198859],
            [-1.63523104195301, 53.4605013063136],
            [-1.6352452684743, 53.4611238095816]
          ]
        ]
      }
    }
  ]
}

const mockIntersectResponse = {
  geometryType: 'esriGeometryPolygon',
  geometries: [
    {
      rings: [
        [
          [-117.18330000340939, 34.04949999973178],
          [-117.18999999761581, 34.049300000071526],
          [-117.18999999761581, 34.05400000140071],
          [-117.18330000340939, 34.05400000140071],
          [-117.18330000340939, 34.04949999973178]
        ]
      ]
    },
    {
      rings: [
        [
          [-117.1900000034094, 34.05450000140071],
          [-117.19199999761581, 34.05470000007153],
          [-117.19199999761581, 34.05500000140071],
          [-117.1900000034094, 34.05500000140071],
          [-117.1900000034094, 34.05450000140071]
        ]
      ]
    }
  ]
}

const mockAreasResponse = {
  areas: [20000, 15000], // Areas for the two intersecting geometries
  lengths: [null] // Not used in this case
}

describe('Find Moorland Intersects', () => {
  const landParcelId = '1234'
  const sheetId = '5678'
  const server = Hapi.server({
    cache: [
      {
        name: 'frps',
        provider: {
          constructor: CatboxMemory.Engine
        }
      }
    ]
  })

  beforeAll(async () => {
    await server.register([land])
    await server.initialize()

    global.fetch = jest.fn((url = '') => {
      if (typeof url !== 'string') {
        return Promise.reject(new Error('Invalid URL'))
      }

      const response = new Response()

      if (url.includes('intersect')) {
        response.json = () => Promise.resolve(mockIntersectResponse)
      } else if (url.includes('areasAndLengths')) {
        response.json = () => Promise.resolve(mockAreasResponse)
      }

      return Promise.resolve(response)
    })

    findLandParcelSpy.mockResolvedValue(mockLandParcelResponse)
    fetchMoorlandIntersectionSpy.mockResolvedValue(mockMoorlandResponse)
  })

  afterAll(async () => {
    await server.stop()
    global.fetch = originalFetch
  })

  test('should fetch intersections, calculate areas, and return the result', async () => {
    const request = {
      method: 'GET',
      url: `/land/intersects/moorland?landParcelId=${landParcelId}&sheetId=${sheetId}`
    }

    /**
     * @type {Hapi.ServerInjectResponse<object>}
     */
    const {
      statusCode,
      result: { message, entity }
    } = await server.inject(request)

    const expected = {
      parcelId: '1234',
      totalIntersectingArea: 35000, // Sum of areas from the mockAreasResponse
      nonIntersectingArea: 15000 // 50000 - 35000
    }

    expect(statusCode).toBe(200)
    expect(message).toBe('success')
    expect(entity).toEqual(expected)
    expect(arcgisService.findLandParcel).toHaveBeenCalledWith(
      server,
      landParcelId,
      sheetId
    )
    expect(arcgisService.fetchIntersection).toHaveBeenCalledWith(
      server,
      {
        rings: [
          [
            [-3.84215781948155, 50.2369627492092],
            [-3.84188557735844, 50.236368577696],
            [-3.84159762148358, 50.2357813103825],
            [-3.84215781948155, 50.2369627492092]
          ]
        ]
      },
      'moorland'
    )
    expect(fetch).toHaveBeenCalledTimes(2) // One call for intersection, one for areas
  })

  test('should handle no land parcel features gracefully', async () => {
    findLandParcelSpy.mockResolvedValueOnce({ features: [] })

    const request = {
      method: 'GET',
      url: `/land/intersects/moorland?landParcelId=${landParcelId}&sheetId=${sheetId}`
    }

    /**
     * @type {Hapi.ServerInjectResponse<object>}
     */
    const {
      statusCode,
      result: { message, entity }
    } = await server.inject(request)

    const expected = {
      parcelId: '1234',
      totalIntersectingArea: 0,
      nonIntersectingArea: 0
    }

    expect(statusCode).toBe(200)
    expect(message).toBe('success')
    expect(entity).toEqual(expected)
    expect(findLandParcelSpy).toHaveBeenCalledWith(
      server,
      landParcelId,
      sheetId
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  test('should handle no Moorland intersections gracefully', async () => {
    fetchMoorlandIntersectionSpy.mockResolvedValueOnce({
      features: []
    })

    const request = {
      method: 'GET',
      url: `/land/intersects/moorland?landParcelId=${landParcelId}&sheetId=${sheetId}`
    }

    /**
     * @type {Hapi.ServerInjectResponse<object>}
     */
    const {
      statusCode,
      result: { message, entity }
    } = await server.inject(request)

    const expected = {
      parcelId: '1234',
      totalIntersectingArea: 0,
      nonIntersectingArea: 50000 // Full parcel area since no intersections
    }
    expect(statusCode).toBe(200)
    expect(message).toBe('success')
    expect(entity).toEqual(expected)
    expect(fetchMoorlandIntersectionSpy).toHaveBeenCalledWith(
      server,
      {
        rings: [
          [
            [-3.84215781948155, 50.2369627492092],
            [-3.84188557735844, 50.236368577696],
            [-3.84159762148358, 50.2357813103825],
            [-3.84215781948155, 50.2369627492092]
          ]
        ]
      },
      'moorland'
    )
    expect(fetch).not.toHaveBeenCalled()
  })
})
