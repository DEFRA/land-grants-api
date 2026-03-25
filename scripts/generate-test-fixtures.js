#!/usr/bin/env node

import { connectToTestDatbase } from '../src/tests/db-tests/setup/postgres.js'
import { createCompatibilityMatrix } from '../src/features/available-area/compatibilityMatrix.js'
import { getAvailableAreaDataRequirements } from '../src/features/available-area/availableArea.js'
import { getAvailableAreaFixtures } from '../src/tests/db-tests/setup/getAvailableAreaFixtures.js'
import { writeFileSync } from 'fs'



import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'



const __dirname = dirname(fileURLToPath(import.meta.url))

// Action codes used in the compatibility matrix (same as in the test)
const ACTION_CODES = [
  'CMOR1',
  'UPL1',
  'UPL2',
  'UPL3',
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
  'GRH7'
]



/**
 * Generate pre-computed fixtures for available area calculation scenarios
 * This eliminates the N+1 query pattern in the slow test
 */
async function generateAvailableAreaFixtures() {
  const logger = {
    log: console.log,
    warn: console.warn,
    info: console.info,
    error: console.error
  }
  
  const connection = connectToTestDatbase()
  
  try {
    console.log('🔄 Starting fixture generation...')
    
    // Step 0: Load test data using the same mechanism as database tests
    console.log('📥 Loading test land data into database...')
    const { ingestLandData } = await import('./local-ingest-service.js')
    await ingestLandData()
    console.log('✅ Test data loaded via ingest service')
    
    // Step 1: Generate compatibility matrix once (instead of 14 times in test)
    console.log('🔍 Generating compatibility matrix...')
    const compatibilityCheckFn = await createCompatibilityMatrix(
      logger,
      connection,
      ACTION_CODES
    )
    
    // Serialize the compatibility matrix results from database
    const compatibilityMatrix = {}
    
    for (const actionA of ACTION_CODES) {
      compatibilityMatrix[actionA] = {}
      for (const actionB of ACTION_CODES) {
        const isCompatible = compatibilityCheckFn(actionA, actionB)
        compatibilityMatrix[actionA][actionB] = isCompatible
      }
    }
    
    // Step 2: Load test scenarios
    console.log('📋 Loading test scenarios...')
    const scenarios = getAvailableAreaFixtures()
    const computedFixtures = {}
    
    // Step 3: Pre-compute database requirements for each scenario
    console.log(`🔄 Pre-computing data requirements for ${scenarios.length} scenarios...`)
    
    for (let i = 0; i < scenarios.length; i++) {
      const [scenarioName, scenario] = scenarios[i]
      console.log(`  📦 Processing: ${scenarioName} (${i + 1}/${scenarios.length})`)
      
      let existingActions = []
      try {
        existingActions = JSON.parse(scenario.existingActions || '[]')
      } catch (e) {
        logger.error(`Error parsing existing actions for scenario ${scenarioName}:`, e)
        existingActions = []
      }
      
      // Pre-compute the database requirements that would be fetched in getAvailableAreaDataRequirements()
      const dataRequirements = await getAvailableAreaDataRequirements(
        scenario.applyingForAction,
        scenario.sheetId,
        scenario.parcelId,
        existingActions,
        connection,
        logger
      )
      
      // Validate that we got real data from database - no fallbacks allowed
      if (!dataRequirements.landCoversForParcel || dataRequirements.landCoversForParcel.length === 0) {
        throw new Error(`❌ No land cover data found in database for parcel ${scenario.sheetId}-${scenario.parcelId}. Cannot generate fixtures without real database data.`)
      }
      
      if (!dataRequirements.landCoverCodesForAppliedForAction || dataRequirements.landCoverCodesForAppliedForAction.length === 0) {
        throw new Error(`❌ No land cover codes found in database for action ${scenario.applyingForAction}. Cannot generate fixtures without real database data.`)
      }
      
      // Validate existing actions have land cover codes
      for (const existingAction of existingActions) {
        if (!dataRequirements.landCoversForExistingActions[existingAction.actionCode]) {
          throw new Error(`❌ No land cover codes found in database for existing action ${existingAction.actionCode}. Cannot generate fixtures without real database data.`)
        }
      }
      
      // Capture actual land cover definitions for recreating landCoverToString
      const allLandCoverCodes = new Set([
        ...dataRequirements.landCoverCodesForAppliedForAction.map((c) => c.landCoverCode),
        ...dataRequirements.landCoversForParcel.map((c) => c.landCoverClassCode),
        ...Object.values(dataRequirements.landCoversForExistingActions).flatMap(codes => codes.map(c => c.landCoverCode))
      ])
      
      const { getLandCoverDefinitions } = await import('../src/features/land-cover-codes/queries/getLandCoverDefinitions.query.js')
      const landCoverDefinitions = await getLandCoverDefinitions(
        Array.from(allLandCoverCodes),
        connection,
        logger
      )

      // Store the computed data
      computedFixtures[scenarioName] = {
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
          landCoverCodesForAppliedForAction: dataRequirements.landCoverCodesForAppliedForAction,
          landCoversForParcel: dataRequirements.landCoversForParcel,
          landCoversForExistingActions: dataRequirements.landCoversForExistingActions,
          // Store the actual land cover definitions needed to recreate landCoverToString
          landCoverDefinitions: landCoverDefinitions
        }
      }
    }
    
    // Step 4: Create the complete fixture file
    const fixturesData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        actionCodes: ACTION_CODES,
        scenarioCount: scenarios.length,
        version: '1.0.0'
      },
      compatibilityMatrix,
      scenarioData: computedFixtures
    }
    
    // Step 5: Write to fixture file
    const outputPath = resolve(__dirname, '../src/tests/db-tests/fixtures/available-area-computed.json')
    console.log(`💾 Writing computed fixtures to: ${outputPath}`)
    
    writeFileSync(outputPath, JSON.stringify(fixturesData, null, 2), 'utf-8')
    
    console.log('✅ Fixture generation completed successfully!')
    console.log(`📊 Generated data for ${scenarios.length} scenarios`)
    console.log(`🔗 Compatibility matrix: ${ACTION_CODES.length}x${ACTION_CODES.length} combinations`)
    
  } catch (error) {
    console.error('❌ Error generating fixtures:', error)
    process.exit(1)
  } finally {
    await connection.end()
  }
}

/**
 * Extract land cover definitions from the landCoverToString function
 * Since functions can't be serialized, we'll store the underlying data
 */
function extractLandCoverDefinitions(landCoverToStringFn) {
  // For now, return empty object - we'll address this if the landCoverToString function
  // is needed in the test. The existing test might work without this.
  return {}
}

// Run the generator if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAvailableAreaFixtures()
    .catch(error => {
      console.error('❌ Fatal error:', error)
      process.exit(1)
    })
}

export { generateAvailableAreaFixtures }