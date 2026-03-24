# Available Area Calculation — LP Approach

## Background

The available area calculation (AAC) determines how much land is available for a new action, given that a farmer's parcel already has existing action commitments. The challenge is that existing actions have a total area but no fixed land cover assignment — we know action SW001 occupies 40,000 sqm, but not whether that's on arable, permanent grassland, or split across both.

Because the answer changes depending on where we assume existing actions sit, the problem is to find the **maximum possible available area** across all valid placements of existing actions.

Problem outline:

- All actions have a set of eligible land covers they can be placed on.
- A compatibility function defines which actions can share land cover (stack) and which cannot (incompatible actions consume the same area).
- Compatibility should be considered for all actions - not just the new action vs existing, but also between existing actions themselves. Compatible existing actions can stack together without consuming additional area, while incompatible ones compete for the same land.

---

## The Three Approaches

### 1. Current production approach (`availableArea.js`)

Uses a greedy **stacking algorithm**:

1. Sort existing actions by area (ascending)
2. Walk through each action, fitting it into compatible stacks or creating new ones
3. Subtract the area of stacks that contain any action incompatible with the new action

This is deterministic and fast, but the result is **sensitive to action ordering**. A different sort order can produce a different available area — meaning the answer may not be the true maximum. The algorithm does not search for the optimal placement.

### 2. Permutation search (`aac-experiment.ts`)

Addresses the ordering sensitivity by being **land-cover-aware**. For each existing action, it generates every permutation of the land covers it could be placed on. It then evaluates the cartesian product of all those permutations and returns the maximum available area found.

This is mathematically correct but has **factorial time complexity**: O((K!)ᴺ) where K is the number of eligible land covers per action and N is the number of existing actions. It becomes computationally impossible at real-world scales.

### 3. LP approach (`aac-lp.js`)

Formulates the same problem as a **linear programme** and solves it directly. The solver simultaneously finds the optimal placement of all existing actions and the maximum area for the new action. Time complexity is polynomial — effectively constant for the problem sizes encountered in practice.

#### Flow Network Analogy

![Flow network diagram](./Min%20Cost%20Flow%20Optimization.svg)

The problem maps onto a **maximum flow with lower bounds** (a variant of min-cost max-flow). The LP formulation is the most natural encoding because it handles equality constraints and maximisation directly, but the network analogy is useful for understanding the structure.

| Flow concept           | This problem                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| Source                 | One per existing action — supplies exactly `areaSqm` of flow (equality, not just a cap)       |
| Source → action edge   | Lower bound = upper bound = `areaSqm` — flow must equal committed area                        |
| Action → cover edge    | Exists only if the action is eligible on that cover; unbounded capacity                       |
| Cover node capacity    | Total area of that cover type — split into `cover_in` / `cover_out` with capacity = `area[c]` |
| New action → sink edge | Lower bound = 0, upper bound = ∞; the flow here is what we maximise                           |
| Sink                   | Absorbs all flow                                                                              |

Standard max-flow algorithms (Ford-Fulkerson, Dinic's) handle upper bounds only. The equality constraints on existing actions make this **max-flow with lower bounds**, which requires the more general min-cost max-flow formulation. The LP encodes this directly without that transformation.

## Consider

Graph algorithm, https://www.npmjs.com/package/min-cost-flow

---

## The LP Formulation

### Variables

| Variable     | Meaning                                                            |
| ------------ | ------------------------------------------------------------------ |
| `x[a, c]`    | sqm of existing action `a` placed on land cover `c`                |
| `y[c]`       | sqm of the new action placed on land cover `c`                     |
| `group[i,c]` | sqm of physical space used by compatibility group `i` on cover `c` |

### Objective

```
maximise  Σ y[c]  for all c ∈ eligible covers for new action
```

### Constraints

**1. Each existing action must account for exactly its committed area:**

```
Σ_c  x[a, c]  =  total_area[a]    for each existing action a
```

**2. Physical capacity — no action can exceed any cover's total area:**

```
x[a, c] ≤ area[c]    for each action a, cover c
```

**3. Incompatibility with new action — group-aware constraint:**

For covers with multiple compatibility groups:

```
Σ_{i: has_incompatible_actions}  group[i, c]  +  y[c]  ≤  area[c]
```

For covers with single compatibility group:

```
Σ_{a: incompatible_with_new}  x[a, c]  +  y[c]  ≤  area[c]
```

**4. Compatibility group constraints — incompatible groups compete for physical space:**

For each cover with multiple compatibility groups:

```
Σ_i  group[i, c]  ≤  area[c]    (groups compete for physical space)

group[i, c] ≥ x[a, c]    for each action a in group i    (group space covers all actions in group)
```

**Key Innovation: Group-Aware Incompatibility**

The constraints implement proper stacking semantics by using **group variables in incompatibility constraints**:

- **Within groups**: Compatible actions share the same physical space, so `group[i,c] = max(actions_in_group[i])`
- **Between groups**: Incompatible groups compete for physical space, so `Σ group[i,c] ≤ area[c]`
- **With new action**: Groups containing incompatible actions contribute their **group space** (not individual areas) to the incompatibility constraint

This correctly models scenarios like:

- `aa1(1000) + aa2(2000)` compatible, only `aa2` incompatible with new action
- **Wrong approach**: new action blocked by `aa1 + aa2 = 3000` sqm
- **Correct approach**: new action blocked by `max(aa1, aa2) = 2000` sqm (group space)
- Result: Available area = `cover_area - 2000` instead of `cover_area - 3000`

## Implementation Details

### Two-Phase Constraint Formation

The LP solver builds constraints in two phases to properly handle group-aware incompatibility:

**Phase 1: Group Formation and Inter-Group Constraints**

1. Find compatibility groups using DFS on the compatibility graph
2. Create group variables `group[i, c]` for each group on each cover
3. Add inter-group competition constraints: `Σ group[i, c] ≤ area[c]`
4. Link group variables to individual actions: `group[i, c] ≥ x[a, c]` for all `a` in group `i`

**Phase 2: Incompatibility Constraints**

1. For each cover, identify which groups contain actions incompatible with the new action
2. **Multi-group covers**: Add group variables to incompatibility constraint
3. **Single-group covers**: Add individual action variables to incompatibility constraint
4. This ensures compatible actions contribute as a group, not as individual areas

This approach prevents "double counting" where compatible actions would each contribute their full area to incompatibility constraints, causing the new action to lose access to shared stacking space.

---

## API Usage

### Function Signature

```js
const outcome = maxAreaForNewAction({
  newAction,
  existingActions,
  landCoverAreas,
  compatibilityCheckFn,
  debug: false
})

if (outcome.status !== 'ok') {
  // LP was infeasible (no solution) - rare edge case
}

// outcome.areas = { 'cover1': area_sqm, ... }
```

### Parameters

- **`newAction`**: The action to place (requires `.action` and `.covers` properties)
- **`existingActions`**: Array of committed actions (requires `.action`, `.covers`, `.area` properties)
- **`landCoverAreas`**: Map of cover ID to available area in sqm
- **`compatibilityCheckFn`**: `(action1Id, action2Id) => boolean` - checks if two actions are compatible for stacking
- **`debug`**: Optional boolean for detailed LP constraint logging

### Return Value

The function returns an object with:

- **`status`**: `'ok'` for successful solve, `'infeasible'` if no solution exists
- **`areas`**: Map of cover ID to allocated area in sqm for the new action
- **`existingActionsByCover`**: Optimal placement of existing actions (debugging only)

---

## Benchmark Results

Run locally with `npm run bench:aac`. All actions eligible for all covers, all actions incompatible with the new action (worst case for both approaches).

### LP — scales flat regardless of problem size

| N actions × K covers | Time   |
| -------------------- | ------ |
| 2×2                  | ~2ms   |
| 3×3                  | ~1ms   |
| 4×4                  | ~0.5ms |
| 5×5                  | ~0.6ms |
| 10×10                | ~2ms   |
| 20×20                | ~8ms   |

### Permutation search — falls off a cliff

| N actions × K covers | Time           | Combinations   |
| -------------------- | -------------- | -------------- |
| 2×2                  | ~1ms           | 4              |
| 3×3                  | ~2ms           | 216            |
| 4×4                  | ~665ms         | 331,776        |
| 4×5                  | _(infeasible)_ | 207,360,000    |
| 5×5                  | _(infeasible)_ | 24,883,200,000 |
| 6×6                  | _(infeasible)_ | ~1.4 × 10¹⁷    |

The permutation approach is capped at 4×4 in the benchmark. Any real-world parcel with 5 existing actions across 5 land cover types would never return.

---

## Implementation Plan

### Step 1 — Input mapping

`maxAreaForNewAction` takes a different input shape to the existing pipeline. A mapper function is needed to bridge from the data fetched by `getAvailableAreaDataRequirements` to the LP format.

```js
/**
 * Converts available area data requirements into LP solver input format.
 *
 * @param {string} actionCodeAppliedFor
 * @param {Action[]} existingActionsWithCommonLandCover
 * @param {LandCover[]} landCoversForParcel
 * @param {Record<string, LandCoverCode[]>} landCoversForExistingActions
 * @param {LandCoverCode[]} landCoverCodesForAppliedForAction
 * @param {CompatibilityCheckFn} compatibilityCheckFn
 * @returns {{ covers, existingActions, eligibility, incompatibleWith }}
 */
function buildLPInput(
  actionCodeAppliedFor,
  existingActionsWithCommonLandCover,
  landCoversForParcel,
  landCoversForExistingActions,
  landCoverCodesForAppliedForAction,
  compatibilityCheckFn
) {
  // covers: { landCoverName → areaSqm } from parcel
  const covers = Object.fromEntries(
    landCoversForParcel.map((lc) => [lc.landCoverClassCode, lc.areaSqm])
  )

  // existingActions: { actionCode → areaSqm }
  const existingActions = Object.fromEntries(
    existingActionsWithCommonLandCover.map((a) => [a.actionCode, a.areaSqm])
  )

  // eligibility: { actionCode → Set<landCoverName> }
  const eligibility = {
    [actionCodeAppliedFor]: new Set(
      landCoverCodesForAppliedForAction.map((c) => c.landCoverCode)
    )
  }
  for (const [code, covers] of Object.entries(landCoversForExistingActions)) {
    eligibility[code] = new Set(covers.map((c) => c.landCoverCode))
  }

  // incompatibleWith: existing actions that cannot share land with the new action
  const incompatibleWith = new Set(
    existingActionsWithCommonLandCover
      .map((a) => a.actionCode)
      .filter((code) => !compatibilityCheckFn(actionCodeAppliedFor, code))
  )

  return { covers, existingActions, eligibility, incompatibleWith }
}
```

### Step 2 — Replace `processIncompatibleAreas` + `processStackingAndCalculateArea`

In `availableArea.js`, the two steps that calculate how much area the new action can have are:

```js
// current
const { revisedActions } = processIncompatibleAreas({ ... })
const { availableAreaSqm } = processStackingAndCalculateArea(revisedActions, ...)
```

These would be replaced by a single LP call:

```js
// proposed
const lpInput = buildLPInput(
  actionCodeAppliedFor,
  existingActionsWithLandCoverInCommonWithAppliedForAction,
  availableAreaDataRequirements.landCoversForParcel,
  availableAreaDataRequirements.landCoversForExistingActions,
  landCoverCodesForAppliedForAction,
  compatibilityCheckFn
)

const { maxAreaSqm, feasible } = maxAreaForNewAction({
  ...lpInput,
  newAction: actionCodeAppliedFor
})
const availableAreaSqm = feasible
  ? Math.min(maxAreaSqm, totalValidLandCoverSqm)
  : 0
const availableAreaHectares = sqmToHaRounded(availableAreaSqm)
```

### Step 3 — Explanations

The current output includes a detailed `explanations` array that documents each stacking decision. The LP solver does not produce human-readable reasoning steps.

Two options:

**Option A — Drop explanations for the AAC step.** The LP result (`existingActionsByCover`) shows where each existing action was optimally placed, which could be used to reconstruct a summary explanation if needed.

**Option B — Keep the existing stacking pipeline for explanations only.** Run the LP for the actual result and the existing stacker for the explanation text. This is transitional overhead but avoids a breaking change to the explanation output.

### Step 4 — Test coverage

The existing tests in `availableArea.test.js` test the full pipeline including stacking internals. These tests should continue to pass unchanged. Additionally, tests for `buildLPInput` should be added to verify the mapping is correct.

---

## Files

| File                | Purpose                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `aac-lp.js`         | LP solver implementation — the replacement for `stackActions` + `subtractIncompatibleStacks` |
| `aac-lp.test.js`    | Unit tests for `maxAreaForNewAction`, mirroring the scenarios from `aac-experiment.test.ts`  |
| `bench.test.ts`     | Benchmark comparing LP vs permutation at various problem sizes                               |
| `aac-experiment.ts` | Original permutation approach (reference only)                                               |

Run the benchmark:

```bash
npm run bench:aac
```

---

## Dependency

`javascript-lp-solver` is a pure JavaScript LP solver with no native dependencies. It is already installed in this repo.

```json
"javascript-lp-solver": "^0.4.24"
```

It uses the simplex method internally. For the problem sizes in this codebase (typically < 10 actions, < 20 land cover types) it solves in under 10ms. No external process, no WASM, no network call.
