#!/usr/bin/env node

import { connectToTestDatbase } from '../src/tests/db-tests/setup/postgres.js'
import { createCompatibilityMatrix } from '../src/features/available-area/compatibilityMatrix.js'
import { getAvailableAreaDataRequirements } from '../src/features/available-area/availableArea.js'
import { getAvailableAreaFixtures } from '../src/tests/db-tests/setup/getAvailableAreaFixtures.js'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Action codes used in the compatibility matrix (same as in the test)
const ACTION_CODES = [
  'CMOR1',
  'UPL1',
  'UPL2',
  'UPL3',
  'UPL4',
  'UPL5',
  'UPL6',
  'UPL7',
  'SAM1',
  'SPM4',
  'OFM1',
  'OFM2',
  'OFM3',
  'SP1',
  'WS1',
  'WS2',
  'CAHL3',
  'CHRW1',
  'CHRW2',
  'CHRW3',
  'PRF1',
  'PRF2',
  'GRH6',
  'GRH7',
  'HEF5',
  'HEF6',
  'HEF8',
  'SP3',
  'WD2',
  'WD10'
]

/**
 * Create a logger object with console methods
 * @returns {Object} Logger object
 */
const createLogger = () => ({
  log: console.log,
  warn: console.warn,
  info: console.info,
  error: console.error
})

/**
 * Load test data into database using the ingest service
 * @returns {Promise<void>}
 */
const loadTestData = async () => {
  console.log('📥 Loading test land data into database...')
  const { ingestLandData } = await import('./local-ingest-service.js')
  await ingestLandData()
  console.log('✅ Test data loaded via ingest service')
}

/**
 * Build compatibility pairs from compatibility check function and action codes
 * @param {Function} compatibilityCheckFn Function to check compatibility between actions
 * @param {Array<string>} actionCodes List of action codes
 * @returns {Array<Array<string>>} Compatible action code pairs
 */
const buildCompatibilityMatrix = (compatibilityCheckFn, actionCodes) => {
  const compatiblePairs = []

  for (const actionA of actionCodes) {
    for (const actionB of actionCodes) {
      const isCompatible = compatibilityCheckFn(actionA, actionB)
      if (isCompatible) {
        compatiblePairs.push([actionA, actionB])
      }
    }
  }

  return compatiblePairs
}

/**
 * Parse existing actions from scenario with error handling
 * @param {Object} scenario Test scenario object
 * @param {string} scenarioName Name of the scenario
 * @param {Object} logger Logger object
 * @returns {Array} Parsed existing actions
 */
const parseExistingActions = (scenario, scenarioName, logger) => {
  try {
    return JSON.parse(scenario.existingActions || '[]')
  } catch (e) {
    logger.error(
      `Error parsing existing actions for scenario ${scenarioName}:`,
      e
    )
    return []
  }
}

/**
 * Validate that data requirements contain real database data
 * @param {Object} dataRequirements Database requirements object
 * @param {Object} scenario Test scenario
 * @param {Array} existingActions Parsed existing actions
 * @throws {Error} If validation fails
 */
const validateDataRequirements = (
  dataRequirements,
  scenario,
  existingActions
) => {
  if (
    !dataRequirements.landCoversForParcel ||
    dataRequirements.landCoversForParcel.length === 0
  ) {
    throw new Error(
      `❌ No land cover data found in database for parcel ${scenario.sheetId}-${scenario.parcelId}. Cannot generate fixtures without real database data.`
    )
  }

  if (
    !dataRequirements.landCoverCodesForAppliedForAction ||
    dataRequirements.landCoverCodesForAppliedForAction.length === 0
  ) {
    throw new Error(
      `❌ No land cover codes found in database for action ${scenario.applyingForAction}. Cannot generate fixtures without real database data.`
    )
  }

  // Validate existing actions have land cover codes
  for (const existingAction of existingActions) {
    if (
      !dataRequirements.landCoversForExistingActions[existingAction.actionCode]
    ) {
      throw new Error(
        `❌ No land cover codes found in database for existing action ${existingAction.actionCode}. Cannot generate fixtures without real database data.`
      )
    }
  }
}

/**
 * Process a single scenario to compute its data requirements
 * @param {Object} scenario Test scenario object
 * @param {string} scenarioName Name of the scenario
 * @param {Object} connection Database connection
 * @param {Object} logger Logger object
 * @returns {Promise<Object>} Computed fixture data for the scenario
 */
const processScenario = async (scenario, scenarioName, connection, logger) => {
  const existingActions = parseExistingActions(scenario, scenarioName, logger)

  // Pre-compute the database requirements
  const dataRequirements = await getAvailableAreaDataRequirements(
    scenario.applyingForAction,
    scenario.sheetId,
    scenario.parcelId,
    existingActions,
    connection,
    logger
  )

  // Validate that we got real data from database
  validateDataRequirements(dataRequirements, scenario, existingActions)

  return {
    // Input parameters (for reference and validation)
    scenario: {
      applyingForAction: scenario.applyingForAction,
      sheetId: scenario.sheetId,
      parcelId: scenario.parcelId,
      existingActions: existingActions,
      expectedAvailableArea: scenario.expectedAvailableArea
    },
    // Pre-computed database results
    dataRequirements: {
      landCoverCodesForAppliedForAction:
        dataRequirements.landCoverCodesForAppliedForAction,
      landCoversForParcel: dataRequirements.landCoversForParcel,
      landCoversForExistingActions:
        dataRequirements.landCoversForExistingActions
    }
  }
}

/**
 * Process all scenarios to compute their data requirements
 * @param {Array} scenarios Array of [scenarioName, scenario] tuples
 * @param {Object} connection Database connection
 * @param {Object} logger Logger object
 * @returns {Promise<Object>} Object mapping scenario names to computed fixtures
 */
const processAllScenarios = async (scenarios, connection, logger) => {
  console.log(
    `🔄 Pre-computing data requirements for ${scenarios.length} scenarios...`
  )

  const computedFixtures = {}

  // Process scenarios sequentially to avoid overwhelming the database
  for (let i = 0; i < scenarios.length; i++) {
    const [scenarioName, scenario] = scenarios[i]
    console.log(
      `  📦 Processing: ${scenarioName} (${i + 1}/${scenarios.length})`
    )

    computedFixtures[scenarioName] = await processScenario(
      scenario,
      scenarioName,
      connection,
      logger
    )
  }

  return computedFixtures
}

/**
 * Create the complete fixtures data structure
 * @param {Array<Array<string>>} compatibilityMatrix Compatible action code pairs
 * @param {Object} computedFixtures Computed scenario fixtures
 * @param {Array} scenarios Array of scenarios
 * @param {Array<string>} actionCodes Action codes
 * @returns {Object} Complete fixtures data structure
 */
const buildFixturesData = (
  compatibilityMatrix,
  computedFixtures,
  scenarios,
  actionCodes
) => ({
  metadata: {
    generatedAt: new Date().toISOString(),
    actionCodes: actionCodes,
    scenarioCount: scenarios.length,
    version: '1.0.0'
  },
  compatibilityMatrix,
  scenarioData: computedFixtures
})

/**
 * Write fixtures data to file
 * @param {Object} fixturesData Complete fixtures data
 * @param {string} outputPath Output file path
 */
const writeFixturesToFile = (fixturesData, outputPath) => {
  console.log(`💾 Writing computed fixtures to: ${outputPath}`)
  writeFileSync(outputPath, JSON.stringify(fixturesData, null, 2), 'utf-8')
}

/**
 * Log completion statistics
 * @param {Array} scenarios Array of scenarios
 * @param {Array<string>} actionCodes Action codes
 * @param {Object} fixturesData Complete fixtures data structure
 */
const logCompletionStats = (scenarios, actionCodes, fixturesData) => {
  console.log('✅ Fixture generation completed successfully!')
  console.log(`📊 Generated data for ${scenarios.length} scenarios`)
  console.log(
    `🔗 Compatible action pairs: ${fixturesData?.compatibilityMatrix?.length || 'unknown'} combinations`
  )
}

/**
 * Generate pre-computed fixtures for available area calculation scenarios
 * This eliminates the N+1 query pattern in the slow test
 */
async function generateAvailableAreaFixtures() {
  const logger = createLogger()
  const connection = connectToTestDatbase()

  try {
    console.log('🔄 Starting fixture generation...')

    // Step 0: Load test data using the same mechanism as database tests
    await loadTestData()

    // Step 1: Generate compatibility pairs once (instead of 14 times in test)
    console.log('🔍 Generating compatibility pairs...')
    const compatibilityCheckFn = await createCompatibilityMatrix(
      logger,
      connection,
      ACTION_CODES
    )
    const compatibilityMatrix = buildCompatibilityMatrix(
      compatibilityCheckFn,
      ACTION_CODES
    )

    // Step 2: Load test scenarios
    console.log('📋 Loading test scenarios...')
    const scenarios = getAvailableAreaFixtures()

    // Step 3: Pre-compute database requirements for each scenario
    const computedFixtures = await processAllScenarios(
      scenarios,
      connection,
      logger
    )

    // Step 4: Create the complete fixture file
    const fixturesData = buildFixturesData(
      compatibilityMatrix,
      computedFixtures,
      scenarios,
      ACTION_CODES
    )

    // Step 5: Write to fixture file
    const outputPath = resolve(
      __dirname,
      '../src/tests/db-tests/fixtures/available-area-computed.json'
    )
    writeFixturesToFile(fixturesData, outputPath)

    logCompletionStats(scenarios, ACTION_CODES, fixturesData)
  } catch (error) {
    console.error('❌ Error generating fixtures:', error)
    process.exit(1)
  } finally {
    await connection.end()
  }
}

// Run the generator if called directly
if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  try {
    await generateAvailableAreaFixtures()
  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

export { generateAvailableAreaFixtures }
