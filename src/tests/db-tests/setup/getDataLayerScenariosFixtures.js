import { parse } from 'csv-parse/sync' // eslint-disable-line
import { readFileSync } from 'fs'
import path from 'path'

export function getDataLayerScenariosFixtures() {
  const fixturePath = path.join(
    __dirname, // eslint-disable-line
    '../fixtures',
    'dataLayerScenarios.csv'
  )
  const content = readFileSync(fixturePath, 'utf-8')
  const fixtures = parse(content, {
    delimiter: ',',
    columns: true
  })
  // eslint-disable-next-line
  return fixtures.map((fixture) => [fixture.name, fixture])
}
