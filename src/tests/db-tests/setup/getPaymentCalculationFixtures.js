import { parse } from 'csv-parse/sync'
import { readFileSync } from 'node:fs'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const _dirname = dirname(fileURLToPath(import.meta.url))

export function getPaymentCalculationFixtures() {
  const fixturePath = path.join(
    _dirname,
    '../fixtures',
    'paymentCalculationScenarios.csv'
  )
  const content = readFileSync(fixturePath, 'utf-8')
  const fixtures = parse(content, {
    delimiter: ',',
    columns: true
  })
  return fixtures.map((fixture) => [fixture.scenarioName, fixture])
}
