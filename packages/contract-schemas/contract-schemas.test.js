import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { application } from '../../src/features/application/index.js'
import { caseManagementAdapter } from '../../src/features/case-management-adapter/index.js'
import { landDataIngest } from '../../src/features/land-data-ingest/index.js'
import { parcel } from '../../src/features/parcel/index.js'
import { payments } from '../../src/features/payment/index.js'
import { vectorTiles } from '../../src/features/vector-tiles/index.js'
import { woodlandManagement } from '../../src/features/woodland-management/index.js'

const packageDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(packageDir, '..', '..')
const PACKAGE_NAME = '@defra/land-grants-contract-schemas'

// The public surface, listed explicitly so adding or dropping an endpoint is a
// deliberate change to this test.
const PUBLIC_ENDPOINTS = [
  'POST /api/v2/parcels',
  'POST /api/v2/parcels/supplements',
  'POST /api/v2/payments/calculate',
  'POST /api/v2/application/validate',
  'POST /application/validation-run/{id}',
  'POST /application/{applicationId}/validation-run',
  'GET /case-management-adapter/application/validation-run/{id}',
  'POST /case-management-adapter/application/validation-run/rerun',
  'POST /api/v1/parcel-tiles/{z}/{x}/{y}',
  'POST /api/v1/parcel-tiles/locate',
  'POST /api/v1/wmp/validate',
  'POST /api/v1/wmp/payments/calculate',
  'POST /api/v1/wmp/payments/calculate-by-total-area',
  'GET /ingest/status'
]

const REQUEST_PARTS = ['params', 'query', 'payload']

const routesRegisteredBy = (feature) => {
  const routes = []
  feature.plugin.register({ route: (route) => routes.push(route) })
  return routes.flat()
}

const servedRoutes = [
  application,
  caseManagementAdapter,
  landDataIngest,
  parcel,
  payments,
  vectorTiles,
  woodlandManagement
].flatMap(routesRegisteredBy)

const endpointOf = (route) => `${route.method} ${route.path}`

// Custom rules carry a function, and the packed copy is a different module
// instance, so functions compare as a marker.
const describeSchema = (schema) =>
  JSON.parse(
    JSON.stringify(schema.describe(), (_key, value) =>
      typeof value === 'function' ? '[function]' : value
    )
  )

const describeEach = (schemas) =>
  Object.fromEntries(
    Object.entries(schemas).map(([key, schema]) => [
      key,
      describeSchema(schema)
    ])
  )

const contractOfRoute = (route) => {
  const { validate = {}, response = {} } = route.options
  const requestParts = REQUEST_PARTS.filter((part) => part in validate)
  const requests = Object.fromEntries(
    requestParts.map((part) => [part, validate[part]])
  )
  return {
    ...describeEach(requests),
    responses: describeEach(response.status ?? {})
  }
}

const describeContract = ({ responses, ...requests }) => ({
  ...describeEach(requests),
  responses: describeEach(responses)
})

describe('@defra/land-grants-contract-schemas', () => {
  let installDir
  let contract

  // Packs the package and unpacks the tarball into a clean node_modules, as a
  // consumer would receive it, so a file missing from the build's copy list
  // fails here rather than in a consumer. `joi` is linked from the repo to
  // keep the test offline.
  beforeAll(async () => {
    installDir = mkdtempSync(join(tmpdir(), 'contract-schemas-'))
    const packDir = join(installDir, 'pack')
    const target = join(installDir, 'node_modules', PACKAGE_NAME)
    mkdirSync(packDir)
    mkdirSync(target, { recursive: true })

    const [{ filename }] = JSON.parse(
      execFileSync(
        'npm',
        [
          'pack',
          '--json',
          '--ignore-scripts=false',
          '--pack-destination',
          packDir
        ],
        {
          cwd: packageDir,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore']
        }
      )
    )
    execFileSync('tar', [
      '-xzf',
      join(packDir, filename),
      '-C',
      target,
      '--strip-components=1'
    ])
    symlinkSync(
      join(repoRoot, 'node_modules', 'joi'),
      join(installDir, 'node_modules', 'joi')
    )

    contract = await import(
      pathToFileURL(join(target, 'dist', 'index.js')).href
    )
  }, 60_000)

  afterAll(() => {
    rmSync(installDir, { recursive: true, force: true })
  })

  test('exports only the paths', () => {
    const exportNames = Object.keys(contract)

    expect(exportNames).toEqual(['paths'])
  })

  test('publishes exactly the agreed endpoints', () => {
    const publishedEndpoints = Object.entries(contract.paths).flatMap(
      ([path, methods]) =>
        Object.keys(methods).map((method) => `${method.toUpperCase()} ${path}`)
    )

    expect(publishedEndpoints.sort()).toEqual([...PUBLIC_ENDPOINTS].sort())
  })

  test('ships no test files or sources outside dist', () => {
    const sourcesShipped = existsSync(
      join(installDir, 'node_modules', PACKAGE_NAME, 'src')
    )

    expect(sourcesShipped).toBe(false)
  })

  test.each(PUBLIC_ENDPOINTS)(
    '%s matches the route the service serves',
    (endpoint) => {
      const [method, path] = endpoint.split(' ')
      const route = servedRoutes.find(
        (served) => endpointOf(served) === endpoint
      )

      const published = describeContract(
        contract.paths[path][method.toLowerCase()]
      )

      expect(published).toEqual(contractOfRoute(route))
    }
  )
})
