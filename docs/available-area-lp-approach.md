# Available Area Calculation — Linear Programming Approach

## Problem Statement

Given a land parcel with known land cover composition and a set of existing environmental actions already allocated on it, determine the **maximum area available** for a new (target) action.

The system knows _how much_ area each existing action occupies, but not _where_ on the parcel it is physically located. The calculation assumes a **best-case arrangement** — existing actions are logically rearranged to minimise their footprint on land that the target action needs.

---

## Key Concepts

### Compatibility

Two actions are **compatible** if they can coexist on the same physical land (stack). Compatible actions sharing land do not increase the total physical footprint — they overlap.

### Eligibility

Each action is only valid on certain **land cover class codes**. An action cannot be placed on land it is not eligible for.

### Target-Eligible Land

The total area of parcel land covers that the target action is eligible for. This is the upper bound on available area.

### Non-Target Land

Parcel land covers that an existing action is eligible for but the target action is **not**. An existing action placed on non-target land does not reduce the area available for the target.

---

## Approach Overview

The LP approach has two stages:

1. **Revise action areas** — reduce each incompatible action's effective area by subtracting the non-target land it could occupy.
2. **Solve for minimum footprint** — use linear programming to find the smallest physical area needed to accommodate all revised incompatible actions on target-eligible land, accounting for stacking.

The available area is then:

```
availableArea = totalTargetEligibleLand − minimumIncompatibleFootprint
```

---

## Stage 1: Revise Action Areas

For each existing action:

1. **Skip compatible actions.** If the action is compatible with the target, it can stack with the target and does not reduce available area. It is excluded from the LP entirely.

2. **Compute non-target eligible area.** Sum the parcel area for every land cover class where the action _is_ eligible but the target is _not_. This is land where the action can be placed without affecting the target at all.

3. **Subtract.** `revisedArea = max(0, actionArea − nonTargetEligibleArea)`. The revised area represents the portion of the action that _must_ compete for target-eligible land.

### Why per-action independent subtraction is correct

Each incompatible action independently gets credit for the full non-target area because:

- Incompatible actions are incompatible with the _target_, not necessarily with each other.
- On non-target land, these actions can freely stack with each other (the LP for target land handles their mutual compatibility separately).
- An action that fits entirely on non-target land has `revisedArea = 0` and drops out of the problem.

### Example

Parcel: Arable (130) = 31,254 sqm, Woodland (330) = 25,329 sqm

Target (CMOR1) eligible for: 130, 330
Existing action (WS1, 25,328 sqm) eligible for: 330 only

WS1 non-target area = 0 sqm (330 is also target-eligible)
WS1 revised area = 25,328 sqm (unchanged — WS1 competes for target land)

---

## Stage 2: Solve Minimum Footprint via LP

After revision, we have a set of incompatible actions with revised areas that must be placed on target-eligible land. Some of these actions may be **compatible with each other** and can share physical land (stack). The LP finds the arrangement that uses the least total physical area.

### Stack-Type Enumeration

A **stack type** is a subset of the revised actions where every pair is mutually compatible. These represent valid configurations — groups of actions that can physically overlap.

We enumerate all such subsets using bitmask iteration. For `n` revised actions, there are up to `2^n - 1` subsets, but only those where all pairs are compatible are kept.

### LP Formulation

**Variables:** One continuous variable `s_i ≥ 0` per stack type, representing the area of land devoted to that configuration.

**Objective:** Minimise total physical footprint:

```
minimise: Σ s_i  (for all stack types i)
```

**Constraints:**

1. **Coverage** — Each action's revised area must be fully covered by stack types that contain it:

   ```
   Σ s_i (where stack type i contains action A) ≥ revisedArea_A
   ```

2. **Capacity** — Total footprint cannot exceed total target-eligible land:

   ```
   Σ s_i ≤ totalTargetEligibleLand
   ```

### Why this works

The solver assigns area to stack types to cover every action's requirement using the minimum total physical footprint. When two incompatible-with-target actions are compatible _with each other_, the solver can assign their shared area to a stack type containing both — counting the physical land only once. This correctly models that their overlap reduces the combined footprint.

### Example

Three actions CHRW1 (10,000), CHRW2 (8,000), CHRW3 (7,000), all incompatible with target, but all compatible with each other. Parcel target land: 11,151 sqm.

Stack types include: {CHRW1}, {CHRW2}, {CHRW3}, {CHRW1,CHRW2}, {CHRW1,CHRW3}, {CHRW2,CHRW3}, {CHRW1,CHRW2,CHRW3}.

The solver finds: assign 7,000 to {CHRW1,CHRW2,CHRW3}, 1,000 to {CHRW1,CHRW2}, 2,000 to {CHRW1}.

- CHRW3 covered: 7,000 ✓
- CHRW2 covered: 7,000 + 1,000 = 8,000 ✓
- CHRW1 covered: 7,000 + 1,000 + 2,000 = 10,000 ✓
- Footprint: 7,000 + 1,000 + 2,000 = 10,000 (not 25,000 if placed separately)

Available area: 11,151 − 10,000 = 1,151 sqm.

---

## Edge Cases

| Scenario                                                | Behaviour                                                                                                                         |
| :------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------- |
| No existing actions                                     | Return total target-eligible land                                                                                                 |
| All existing actions compatible with target             | All skipped in stage 1; footprint = 0; return full area                                                                           |
| Existing action has no land cover in common with parcel | Skipped (no eligible land cover codes found)                                                                                      |
| Action eligible only for non-target land                | `revisedArea = 0`; drops out of LP                                                                                                |
| Total action area exceeds parcel area                   | Actions may span multiple parcels; per-action subtraction naturally handles this — excess area goes to other parcels not in scope |
| Single incompatible action                              | LP trivially returns its revised area as footprint                                                                                |
| LP infeasible                                           | Returns footprint = 0 (conservative fallback)                                                                                     |

---

## Complexity

- **Stage 1:** O(A × L) where A = number of existing actions, L = number of land cover classes on parcel.
- **Stage 2:** Enumeration is O(2^N) where N = number of revised incompatible actions. This is practical because N is typically small (most actions are either compatible or absorbed by non-target land). The LP itself is solved by `javascript-lp-solver` using the simplex method.

---

## Limitations

The current implementation treats all target-eligible land as a single pool in the LP. It does not model per-land-cover placement — i.e., it does not account for the fact that an existing action may only be eligible for a _subset_ of the target-eligible land covers.

This can lead to a slight overestimate of the footprint in scenarios where an incompatible action's eligible land covers are a strict subset of the target's eligible covers on the parcel. A per-land-cover LP formulation would address this but adds model complexity.
