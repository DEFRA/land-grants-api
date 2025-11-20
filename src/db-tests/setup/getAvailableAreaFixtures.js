import { parse } from 'csv-parse/sync' // eslint-disable-line
import { readFileSync } from 'fs'
import path from 'path'

export function getAvailableAreaFixtures() {
  const fixturePath = path.join(
    __dirname, // eslint-disable-line
    '../fixtures',
    'availableAreaCalculationScenarios.csv'
  )
  const content = readFileSync(fixturePath, 'utf-8')
  const fixtures = parse(content, {
    delimiter: ',',
    columns: true
  })
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - fixture type from csv-parse
  return fixtures.map((fixture) => [fixture.scenarioName, fixture])
}
