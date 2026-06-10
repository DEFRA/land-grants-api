import { findMaximumAvailableArea } from './availableArea.js'
import { makeCompatibilityCheckFn } from './testUtils.js'
import { landCoverToString } from './testLandCoverToString.js'

const NUM_EXISTING_ACTIONS = 19
const NUM_LAND_COVERS = 20
const LAND_COVER_AREA_SQM = 10_000
const EXISTING_ACTION_AREA_SQM = 5_000
const ELIGIBILITY_WINDOW = 5
const INCOMPATIBILITY_WINDOW = 4
const RUNTIME_CEILING_MS = 100

const TARGET = 'TARGET'

const actionCode = (i) => `ACT_${String(i).padStart(2, '0')}`
const landCoverCode = (i) => `LC_${String(i).padStart(2, '0')}`

function buildLargeScenario() {
  const landCoversForParcel = Array.from(
    { length: NUM_LAND_COVERS },
    (_, i) => ({
      landCoverClassCode: landCoverCode(i),
      areaSqm: LAND_COVER_AREA_SQM
    })
  )

  const landCoverCodesForAppliedForAction = landCoversForParcel.map((lc) => ({
    landCoverCode: lc.landCoverClassCode,
    landCoverClassCode: lc.landCoverClassCode
  }))

  const existingActions = Array.from(
    { length: NUM_EXISTING_ACTIONS },
    (_, i) => ({
      actionCode: actionCode(i + 1),
      areaSqm: EXISTING_ACTION_AREA_SQM
    })
  )

  // Each existing action is eligible for a rotating window of land covers
  const landCoversForExistingActions = {}
  for (let i = 0; i < NUM_EXISTING_ACTIONS; i++) {
    const code = actionCode(i + 1)
    landCoversForExistingActions[code] = Array.from(
      { length: ELIGIBILITY_WINDOW },
      (_, k) => {
        const lcIdx = (i + k) % NUM_LAND_COVERS
        return {
          landCoverCode: landCoverCode(lcIdx),
          landCoverClassCode: landCoverCode(lcIdx)
        }
      }
    )
  }

  // Circular neighbour-incompatibility: ACT_i is incompatible with the next
  // INCOMPATIBILITY_WINDOW actions (mod NUM_EXISTING_ACTIONS). TARGET is
  // incompatible with every other action. Everything else is compatible.
  const compatibilityMap = {}
  for (let i = 1; i <= NUM_EXISTING_ACTIONS; i++) {
    compatibilityMap[actionCode(i)] = []
    for (let j = 1; j <= NUM_EXISTING_ACTIONS; j++) {
      if (i === j) continue
      const distance = Math.min(
        (j - i + NUM_EXISTING_ACTIONS) % NUM_EXISTING_ACTIONS,
        (i - j + NUM_EXISTING_ACTIONS) % NUM_EXISTING_ACTIONS
      )
      if (distance > INCOMPATIBILITY_WINDOW) {
        compatibilityMap[actionCode(i)].push(actionCode(j))
      }
    }
    if (i % 2 === 0) {
      compatibilityMap[actionCode(i)].push(TARGET)
    }
  }
  compatibilityMap[TARGET] = []
  for (let i = 2; i <= NUM_EXISTING_ACTIONS; i += 2) {
    compatibilityMap[TARGET].push(actionCode(i))
  }

  const compatibilityCheckFn = makeCompatibilityCheckFn(compatibilityMap)

  return {
    applyingForAction: TARGET,
    existingActions,
    compatibilityCheckFn,
    dataRequirements: {
      landCoverCodesForAppliedForAction,
      landCoversForParcel,
      landCoversForExistingActions,
      landCoverToString
    }
  }
}

describe('Available Area Calculation - LP solver performance', () => {
  test(`LP solver handles ${NUM_EXISTING_ACTIONS + 1} actions x ${NUM_LAND_COVERS} land covers in reasonable time`, () => {
    const {
      applyingForAction,
      existingActions,
      compatibilityCheckFn,
      dataRequirements
    } = buildLargeScenario()

    const start = performance.now()
    const result = findMaximumAvailableArea(
      applyingForAction,
      existingActions,
      compatibilityCheckFn,
      dataRequirements
    )
    const elapsedMs = performance.now() - start

    console.log(
      `LP runtime (${NUM_EXISTING_ACTIONS + 1} actions x ${NUM_LAND_COVERS} land covers): ${elapsedMs.toFixed(2)} ms`
    )
    console.log(
      `  feasible=${result.feasible}, availableAreaHectares=${result.availableAreaHectares}, totalValidLandCoverSqm=${result.totalValidLandCoverSqm}`
    )

    expect(result.feasible).toBe(true)
    expect(result.availableAreaSqm).toBeGreaterThanOrEqual(0)
    expect(elapsedMs).toBeLessThan(RUNTIME_CEILING_MS)
  })
})
