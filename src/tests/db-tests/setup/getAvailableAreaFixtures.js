import { parse } from 'csv-parse/sync'
import { readFileSync } from 'node:fs'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function getAvailableAreaFixtures() {
  const fixturePath = path.join(
    __dirname,
    '../fixtures',
    'availableAreaCalculationScenarios.csv'
  )
  const content = readFileSync(fixturePath, 'utf-8')
  const fixtures = parse(content, {
    delimiter: ',',
    columns: true
  })

  // @ts-expect-error - csv input isn't typed
  return fixtures.map((fixture) => [fixture.scenarioName, fixture])
}

/**
 * Load pre-computed available area fixtures for fast testing
 * @returns {Array} Array of [scenarioName, scenarioData, computedRequirements] tuples
 */
export function getAvailableAreaComputedFixtures() {
  const computedFixturePath = path.join(
    __dirname,
    '../fixtures',
    'available-area-computed.json'
  )

  try {
    const content = readFileSync(computedFixturePath, 'utf-8')
    const data = JSON.parse(content)

    // Validate the fixture structure
    if (!data.metadata || !data.compatibilityMatrix || !data.scenarioData) {
      throw new Error('Invalid computed fixture structure')
    }

    // Create compatibility check function from compatible pairs
    const compatibilityMatrix = data.compatibilityMatrix
    const pairSet = new Set(compatibilityMatrix.map(pair => `${pair[0]}:${pair[1]}`))
    const compatibilityCheckFn = (actionA, actionB) => {
      return pairSet.has(`${actionA}:${actionB}`)
    }

    // Convert scenario data into test.each format with computed data
    const fixtures = Object.entries(data.scenarioData).map(
      ([scenarioName, scenarioData]) => [
        scenarioName,
        {
          // Original scenario properties
          applyingForAction: scenarioData.scenario.applyingForAction,
          sheetId: scenarioData.scenario.sheetId,
          parcelId: scenarioData.scenario.parcelId,
          existingActions: scenarioData.scenario.existingActions,
          expectedAvailableArea: scenarioData.scenario.expectedAvailableArea
        },
        {
          // Pre-computed data
          compatibilityCheckFn,
          dataRequirements: scenarioData.dataRequirements
        }
      ]
    )

    return fixtures
  } catch (error) {
    console.error('Failed to load computed fixtures:', error)
    console.log(
      '💡 Run "npm run test:fixtures:generate" to create the computed fixtures'
    )
    throw new Error(
      'Computed fixtures not available. Please generate them first.'
    )
  }
}
