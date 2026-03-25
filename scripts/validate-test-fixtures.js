#!/usr/bin/env node

import { existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getAvailableAreaFixtures } from '../src/tests/db-tests/setup/getAvailableAreaFixtures.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Validate that computed fixtures are in sync with CSV scenarios
 */
async function validateTestFixtures() {
  console.log('🔍 Validating test fixtures...')

  try {
    // Check if computed fixtures exist
    const computedFixturePath = resolve(
      __dirname,
      '../src/tests/db-tests/fixtures/available-area-computed.json'
    )

    if (!existsSync(computedFixturePath)) {
      console.error('❌ Computed fixtures not found!')
      console.log('💡 Run "npm run test:fixtures:generate" to create them')
      process.exit(1)
    }

    // Load CSV scenarios
    const csvFixtures = getAvailableAreaFixtures()
    console.log(`📋 Found ${csvFixtures.length} CSV scenarios`)

    // Load computed fixtures
    const computedData = JSON.parse(readFileSync(computedFixturePath, 'utf-8'))
    console.log(
      `💾 Found ${Object.keys(computedData.scenarioData).length} computed scenarios`
    )

    // Validate structure
    if (
      !computedData.metadata ||
      !computedData.compatibilityMatrix ||
      !computedData.scenarioData
    ) {
      console.error('❌ Invalid computed fixture structure!')
      process.exit(1)
    }

    // Check version and timestamp
    const generatedAt = new Date(computedData.metadata.generatedAt)
    const age = (Date.now() - generatedAt.getTime()) / (1000 * 60 * 60 * 24) // days

    console.log(`📅 Fixtures generated: ${computedData.metadata.generatedAt}`)
    console.log(`⏰ Age: ${age.toFixed(1)} days`)

    if (age > 30) {
      console.warn(
        '⚠️  Computed fixtures are over 30 days old - consider regenerating'
      )
    }

    // Check scenario count matches
    if (csvFixtures.length !== Object.keys(computedData.scenarioData).length) {
      console.error('❌ Scenario count mismatch!')
      console.error(
        `CSV: ${csvFixtures.length}, Computed: ${Object.keys(computedData.scenarioData).length}`
      )
      process.exit(1)
    }

    // Check that all CSV scenarios have computed data
    const missingScenarios = []
    for (const [scenarioName] of csvFixtures) {
      if (!computedData.scenarioData[scenarioName]) {
        missingScenarios.push(scenarioName)
      }
    }

    if (missingScenarios.length > 0) {
      console.error('❌ Missing computed data for scenarios:')
      missingScenarios.forEach((name) => console.error(`   - ${name}`))
      console.log(
        '💡 Run "npm run test:fixtures:generate" to regenerate fixtures'
      )
      process.exit(1)
    }

    // Check for extra computed scenarios (not in CSV)
    const extraScenarios = Object.keys(computedData.scenarioData).filter(
      (name) => !csvFixtures.find(([csvName]) => csvName === name)
    )

    if (extraScenarios.length > 0) {
      console.warn('⚠️  Extra computed scenarios (not in CSV):')
      extraScenarios.forEach((name) => console.warn(`   - ${name}`))
      console.log('💡 Consider regenerating fixtures to remove stale data')
    }

    // Sample data validation
    console.log('🔍 Validating sample scenario structure...')
    const firstScenario = Object.values(computedData.scenarioData)[0]

    const requiredFields = [
      'scenario.applyingForAction',
      'scenario.sheetId',
      'scenario.parcelId',
      'scenario.existingActions',
      'scenario.expectedAvailableArea',
      'dataRequirements.landCoverCodesForAppliedForAction',
      'dataRequirements.landCoversForParcel',
      'dataRequirements.landCoversForExistingActions'
    ]

    for (const field of requiredFields) {
      const parts = field.split('.')
      let obj = firstScenario
      for (const part of parts) {
        obj = obj?.[part]
      }
      if (obj === undefined) {
        console.error(`❌ Missing required field: ${field}`)
        process.exit(1)
      }
    }

    // Compatibility matrix validation
    console.log('🔍 Validating compatibility matrix...')
    const actionCount = computedData.metadata.actionCodes?.length || 0
    const matrixSize = Object.keys(computedData.compatibilityMatrix).length

    if (actionCount === 0 || matrixSize !== actionCount) {
      console.error('❌ Compatibility matrix size mismatch!')
      console.error(
        `Expected: ${actionCount}x${actionCount}, Found: ${matrixSize}x${matrixSize}`
      )
      process.exit(1)
    }

    console.log('✅ All fixture validation checks passed!')
    console.log(`📊 ${csvFixtures.length} scenarios ready for testing`)
    console.log(`🎯 Compatible actions: ${actionCount}`)
    console.log(`💗 Fixtures are healthy and up to date`)
  } catch (error) {
    console.error('❌ Validation failed:', error.message)
    process.exit(1)
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateTestFixtures().catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
}

export { validateTestFixtures }
