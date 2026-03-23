import { test } from 'vitest'
import { maxAreaForNewAction } from './aac-lp.js'
import { getMaximumAvailableAreaForActionLazy } from './aac-experiment.ts'
import type { LandCover, Action, LandCoversForActions } from './aac-experiment.types.ts'

function makePermData(n: number, k: number) {
  const actions: Action[] = []
  const landCovers: LandCover[] = []
  const landCoversForActions: LandCoversForActions = {}
  for (let i = 1; i <= n; i++) {
    actions.push({ code: `AA${i}`, areaSqm: 1000 })
    landCoversForActions[`AA${i}`] = []
  }
  for (let i = 1; i <= k; i++) {
    landCovers.push({ name: `LC${i}`, areaSqm: 1000 })
    for (let j = 1; j <= n; j++) landCoversForActions[`AA${j}`].push(`LC${i}`)
  }
  landCoversForActions['CMOR1'] = landCovers.map((c) => c.name)
  return { actions, landCovers, landCoversForActions }
}

function makeLPData(n: number, k: number) {
  const covers: Record<string, number> = {}
  const existingActions: Record<string, number> = {}
  const eligibility: Record<string, Set<string>> = {}
  for (let i = 1; i <= k; i++) covers[`LC${i}`] = 1000
  for (let i = 1; i <= n; i++) {
    existingActions[`AA${i}`] = 1000
    eligibility[`AA${i}`] = new Set(Object.keys(covers))
  }
  eligibility['CMOR1'] = new Set(Object.keys(covers))
  const incompatibleWith = new Set(Object.keys(existingActions))
  return { covers, existingActions, eligibility, incompatibleWith }
}

const compatibilityCheckFn = () => false
const factorial = (x: number): number => (x <= 1 ? 1 : x * factorial(x - 1))

// Permutation approach becomes impractical at 5×5 (24.8 billion combinations).
// Capped at 4×4 to keep the benchmark runnable.
const permSizes: [number, number][] = [
  [2, 2],
  [3, 3],
  [4, 4]
]

// LP scales polynomially — safe to run at much larger sizes.
const lpSizes: [number, number][] = [
  [2, 2],
  [3, 3],
  [4, 4],
  [5, 5],
  [10, 10],
  [20, 20]
]

test('LP vs permutation benchmark', () => {
  console.log('\n=== LP (polynomial time) ===')
  console.log('N×K    | ms')
  console.log('-------|-------')
  for (const [n, k] of lpSizes) {
    const lpData = makeLPData(n, k)
    const start = performance.now()
    maxAreaForNewAction({ ...lpData, newAction: 'CMOR1' })
    const ms = (performance.now() - start).toFixed(2)
    console.log(`${n}×${k}    | ${ms}`)
  }

  console.log('\n=== Permutation search (factorial time, capped at 4×4) ===')
  console.log('N×K  | ms       | combinations')
  console.log('-----|----------|-------------')
  for (const [n, k] of permSizes) {
    const combos = Math.pow(factorial(k), n)
    const permData = makePermData(n, k)
    const start = performance.now()
    getMaximumAvailableAreaForActionLazy(
      'CMOR1',
      permData.actions,
      permData.landCovers,
      permData.landCoversForActions,
      compatibilityCheckFn
    )
    const ms = (performance.now() - start).toFixed(2)
    console.log(`${n}×${k}  | ${ms.padStart(8)} | ${combos.toLocaleString()}`)
  }

  console.log('\n=== Combinatorial explosion — permutation sizes not run ===')
  console.log('N×K   | combinations')
  console.log('------|-------------')
  const explosiveSizes = [
    [4, 5],
    [5, 5],
    [6, 6],
    [8, 8],
    [10, 10]
  ]
  for (const [n, k] of explosiveSizes) {
    const combos = Math.pow(factorial(k), n)
    const comboStr =
      combos > 1e15
        ? `~${combos.toExponential(2)}`
        : combos.toLocaleString()
    console.log(`${n}×${k}   | ${comboStr}`)
  }
}, 30_000)
