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

    // Create compatibility check function from serialized matrix
    const compatibilityMatrix = data.compatibilityMatrix
    const compatibilityCheckFn = (actionA, actionB) => {
      return compatibilityMatrix[actionA]?.[actionB] ?? false
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

/**
 * Create a landCoverToString function from stored land cover definitions
 * @param {Array} landCoverDefinitions - Array of land cover definitions from the database
 * @returns {Function} Function to convert land cover codes to strings
 */
export function createLandCoverToStringFromDefinitions(landCoverDefinitions) {
  // If no definitions provided, return a basic function
  if (!landCoverDefinitions || landCoverDefinitions.length === 0) {
    return (code) => `Unknown land cover code: ${code}`
  }

  // Create the same lookup objects as createLandCoverCodeToString
  const byLandCoverCode = {}
  const byLandCoverClassCode = {}

  for (const landCoverDefinition of landCoverDefinitions) {
    byLandCoverCode[landCoverDefinition.landCoverCode] = landCoverDefinition
    byLandCoverClassCode[landCoverDefinition.landCoverClassCode] =
      landCoverDefinition
  }

  // Return the same function as makeLandCoverToString
  return (landCoverCode, noWarning = false) => {
    const landCover = byLandCoverCode[landCoverCode]

    if (landCover != null) {
      return `${landCover.landCoverDescription} (${landCover.landCoverCode})`
    }

    const landCoverClass = byLandCoverClassCode[landCoverCode]

    if (landCoverClass != null) {
      return `${landCoverClass.landCoverClassDescription} (${landCoverClass.landCoverClassCode})${noWarning ? '' : ' Warning: This is a land cover class'}`
    }

    return `Unknown land cover code: ${landCoverCode}`
  }
}
