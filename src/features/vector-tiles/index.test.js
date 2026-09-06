import Hapi from '@hapi/hapi'
import { vi } from 'vitest'
import { vectorTiles } from './index.js'

const AUTH_SCHEME = 'test-bearer'

// Registers the real plugin against a real Hapi server. The controller tests
// declare their own routes, so without this nothing checks that the routes the
// application actually serves are well-formed - Hapi rejects some option
// combinations at registration time, which would take the server down on boot.
describe('vectorTiles plugin', () => {
  const buildServer = async () => {
    const server = Hapi.server()
    server.auth.scheme(AUTH_SCHEME, () => ({
      authenticate: (_request, h) => h.authenticated({ credentials: {} })
    }))
    server.auth.strategy(AUTH_SCHEME, AUTH_SCHEME)
    server.auth.default(AUTH_SCHEME)
    server.decorate('request', 'logger', { info: vi.fn(), error: vi.fn() })
    server.decorate('server', 'postgresDb', { connect: vi.fn() })
    await server.register([vectorTiles])
    return server
  }

  it('registers without error', async () => {
    await expect(buildServer()).resolves.toBeDefined()
  })

  it('serves the parcel tile route as POST, so the request can carry parcel ids in its body', async () => {
    const server = await buildServer()

    const route = server
      .table()
      .find((r) => r.path === '/api/v1/parcel-tiles/{z}/{x}/{y}')

    expect(route?.method).toBe('post')
  })

  it('serves the locate route as POST', async () => {
    const server = await buildServer()

    const route = server
      .table()
      .find((r) => r.path === '/api/v1/parcel-tiles/locate')

    expect(route?.method).toBe('post')
  })

  // Routes inherit the server's default auth strategy unless they opt out with
  // `auth: false`, which is the only case Hapi records on the route itself.
  it('does not let any vector-tiles route opt out of authentication', async () => {
    const server = await buildServer()

    const optedOut = server
      .table()
      .filter((route) => route.settings.auth === false)
      .map((route) => route.path)

    expect(optedOut).toEqual([])
  })
})
