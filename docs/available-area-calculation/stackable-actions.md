# Stackable Actions — Technical Specification

How land-grants-api decides which actions may share the same ground, and how that decision feeds the available area calculation (AAC). This describes the behaviour the code should have and how to build it. The reasoning behind it, and the alternatives considered, are in LDR LGA-008 (Supplemental and Stackable Actions) in the farming-grants-docs repository. Where this document and the LDR disagree, the LDR is the decision and this document is the one to fix.

**Status.** The current-behaviour sections describe `main`. The target-behaviour sections depend on LGA-008, which is still proposed. Steps 1 and 2 of [the build plan](#build-plan) are the committed scope; step 3 is optional.

**Not covered here.** Supplemental actions (an action that only exists on top of a base action, such as GRH7 on CLIG3) are a separate piece of work with their own rules: base present, containment, `SUPAGR` pseudo-supplements. They are specified in LGA-008 Part 1. They feed the same engine, so [Extension points](#extension-points-for-supplemental-actions) lists where they plug in.

Read `aac-explained.md` and `aac-specification.md` first. This document assumes the AAC's best-case principle, its land cover eligibility rules, and its treatment of SSSI and historic-feature zones.

---

## 1. What "stackable" means

Two actions are **stackable** (GOV.UK's word; this codebase says *compatible*) when they may be carried out on the same area of a parcel at the same time. Each is paid in full and neither uses up the other's area.

Two actions that are not stackable can both be on the parcel, but not on the same ground. GOV.UK calls that *co-locating*; this codebase says *incompatible*.

A **stack** is one set of actions occupying one piece of ground. A stack is valid when every pair of actions in it is compatible.

### The five rules

1. **Compatibility is pairwise.** A stack is valid only if every pair in it has a compatibility row. There is no group-level permission.
2. **Compatibility is not transitive.** If A–B and B–C are compatible, nothing follows about A–C. The stack {A, B, C} needs all three pairs.
3. **Absence means incompatible.** A pair with no row cannot share ground. The RPA confirms this is the intended reading.
4. **A self-pair is incompatible unless the matrix says otherwise.** A second CLIG3 cannot be stacked on the first. Two actions, `CIPM1` and `CNUM1`, have a self row and may stack on themselves. Do not hard-code "never compatible with itself".
5. **A few pairs are parcel-exclusive.** Actions paired by `BASEPA` may not appear on the same parcel at all, even on different ground. This is rare and is a check before the area calculation, not part of it.

---

## 2. The compatibility matrix

Source: `src/land-data/compatibility_matrix/compatibility-matrix.csv`, loaded into the `compatibility_matrix` table. The RPA publishes it as `EXP_OPTION_COMPATIBILITY`. 2026 has 31,788 rows over 559 codes.

| Column | Meaning |
| --- | --- |
| `OPTION CODE` | Action A |
| `OPTION CODE COMPAT` | Action B |
| `TYPE` | Relationship (below) |
| `YEAR` | Scheme year |

| `TYPE` | 2026 rows | Stored | Meaning for stackable actions |
| --- | --- | --- | --- |
| `BASECO` | 30,358 | Both directions | A and B may share the same area |
| `BASEPA` | 310 | Both directions | A and B may not be on the same parcel. Rare; RPA says little used outside a few capital/revenue combinations |
| `SUPBAS`, `SUPBPA`, `SUPAGR` | 564, 552, 4 | One direction only | Base → supplement. **Not a stackable-actions concern.** Ignore for coexistence logic here |

Facts the code can rely on, checked against the 2026 file:

- Every `BASECO` and `BASEPA` row has its mirror row. Treating them as undirected is safe, and a lookup that tests both directions is correct.
- The `SUP*` rows have no mirror. Any code that filters or indexes the matrix by `option_code` alone loses them (see [the loader](#loader-and-filter)).
- Two `BASECO` rows are self-pairs: `CIPM1`–`CIPM1` and `CNUM1`–`CNUM1`.
- 39 pairs carry two types, for example CAGF1 → CSP3 is both `BASECO` and `SUPBPA`. Row identity is (`option_code`, `option_code_compat`, `type`, `year`), not the pair alone.
- Some pairs appear with `BASECO` one way and `BASEPA` the other (for example GS1A/SI1A). Whether `BASEPA` should beat `BASECO` is an open question in LGA-008; the rule below assumes it does.

### Normalisation rules

Applied once, when the matrix is loaded into the in-memory model:

1. `BASECO(a, b)` in either direction makes `{a, b}` compatible.
2. `BASEPA(a, b)` in either direction makes `{a, b}` parcel-exclusive. If the same pair is also `BASECO`, **parcel-exclusive wins** and a warning is logged naming the pair.
3. A self-pair is compatible only if a `BASECO` self row exists.
4. Any pair with no `BASECO` row is incompatible.
5. `SUP*` rows contribute nothing to compatibility here. (Supplemental work reads them separately; see [Extension points](#extension-points-for-supplemental-actions).)

---

## 3. How it works today

### Where compatibility is looked up

`src/features/available-area/compatibilityMatrix.js` returns a function `(action1, action2) => boolean`. It loads rows with `getCompatibilityMatrix` and answers each query with a linear `Array.some` over every row, testing both directions. It ignores `TYPE` because the transformer (`compatibility-matrix.transformer.js`) and the table do not carry it.

The consequences:

- every `SUP*` and `BASEPA` row is read as "may share the same area";
- each pair lookup scans the whole array, and the LP builds all pairs among the actions on a parcel;
- an action pair with no row is incompatible, which is correct.

### Where it is used

`findMaximumAvailableArea` (`src/features/available-area/availableArea.js`) is the only consumer.

1. Existing actions on the parcel (agreements, plus other actions in the same application) are consolidated by code, summing areas (`consolidateActions`).
2. The target is relabelled `<code>__target` (`TARGET_SUFFIX`) so it does not collide with an existing action of the same code. The compatibility function is wrapped to strip the suffix before lookup. This is how a second CLIG3 ends up incompatible with an existing CLIG3: the lookup is `(CLIG3, CLIG3)`, which has no row.
3. `findMaximalCliques` builds the **incompatibility graph** (an edge for each pair where the function returns false), finds maximal cliques with Bron–Kerbosch, and adds every action as a singleton clique.
4. `buildLpModel` creates one variable per (existing action, eligible land cover) and one `t_<lc>` per land cover the target may use. Demand constraints force each existing action to be fully placed. For every clique and every land cover, a capacity constraint caps the sum of the members' placements at the land cover's area.
5. The LP maximises the sum of the `t` variables.

Land covers are already split into designation zones when SSSI or historic-feature ineligibility applies. "Land cover" below means those effective land covers.

### Where today's engine is weak

| # | Gap | Effect |
| --- | --- | --- |
| 1 | `TYPE` is dropped, so `BASEPA` reads as compatible | Parcel-exclusive actions are offered area (example: AB2 on a parcel that has RP32) |
| 2 | Clique capacity constraints are exact only if the incompatibility graph has no odd cycle of five or more | In rare layouts the area is overstated. A five-ring with 3.6 ha each, plus a target compatible with none, gives 2.8 ha where 1.0 ha is true |
| 3 | Linear scan per pair | Cost grows with the square of the action count, on every request |

Gap 2 has not been seen on real data.

---

## 4. Target behaviour

### 4.1 The model

Build once, then reuse:

```js
/**
 * @typedef {object} CoexistenceModel
 * @property {(a: string, b: string) => boolean} isCompatible       // may share the same area
 * @property {(a: string, b: string) => boolean} isParcelExclusive  // may not share a parcel
 */
```

Implementation notes:

- Key pairs in a `Set` as `` `${min}|${max}` `` using the string order of the two codes. Self-pairs key as `` `${a}|${a}` ``.
- Keep two sets: `compatible` and `parcelExclusive`. Fill them by the [normalisation rules](#normalisation-rules).
- `isCompatible(a, b)` returns `compatible.has(key(a,b)) && !parcelExclusive.has(key(a,b))`.
- The function is pure and has no database access. The AAC takes it as `CompatibilityCheckFn` exactly as today, so `findMaximumAvailableArea` does not change shape.

### Loader and filter

- Add a `relationship_type` column to `compatibility_matrix` (`VARCHAR(10) NOT NULL`, check-constrained to the ingested types), copy `TYPE` across in `insert_compatibility_matrix.sql`, and expose `relationshipType` from the transformer. This is shared with supplemental work.
- `getCompatibilityMatrix` currently filters with `WHERE option_code = ANY ($1)`. That is enough for `BASECO` and `BASEPA`, which are stored both ways, but **not** for `SUP*`. If the model will also serve supplemental work, filter on `option_code = ANY ($1) OR option_code_compat = ANY ($1)`.
- Build the model once per ingest (`ingest_id`) and cache it, not once per request. Invalidate when a new ingest completes. If caching per ingest is not yet possible, building per request with the `Set` index is still a large improvement over the linear scan.

### 4.2 Parcel-exclusive check

Runs before the area calculation. For the target action and the set of existing actions on the same parcel (agreements plus other actions in the same application):

- If `isParcelExclusive(target, e)` is true for any existing `e`, fail with reason code `PARCEL_EXCLUSIVE` and the code of the clashing action. Available area is 0.
- An exclusive action on a *different* parcel does not trigger it.

Order of checks, most basic first:

| Order | Check | Reason code |
| --- | --- | --- |
| 1 | Eligible land cover after SSSI/HF | `NO_ELIGIBLE_LAND` |
| 2 | **Parcel-exclusive** | `PARCEL_EXCLUSIVE` |
| 3 | Supplement base present (supplemental work) | `BASE_MISSING`, `BASE_NOT_IN_APPLICATION` |
| 4 | Existing actions can all be placed | `EXISTING_INFEASIBLE` |
| 5 | Applied quantity within available | `FULLY_OCCUPIED`, `EXCEEDS_AVAILABLE` |
| 6 | Total-area-only actions | existing rule |

### 4.3 The area calculation

Two implementations satisfy the same contract. The contract:

> Given the existing actions placed in full, which each can only occupy land covers they are eligible for, and where each land cover's area is shared by actions only in valid stacks, return the maximum area the target can occupy.

**Option 1 — keep the clique LP** (default). Nothing changes in `availableArea.js` except that `compatibilityCheckFn` now comes from the model. This is exact except for gap 2.

**Option 2 — the stack LP** (only if gap 2 or the overlapping-bases over-offer in the supplemental work shows up in practice). Replace the clique constraints with variables for stacks.

#### Stack LP

A **stack variable** `y[S, l]` is the area of land cover `l` that carries exactly the set of actions `S`.

Enumerate `S` as every non-empty subset of the actions (existing plus the labelled target) in which every pair is compatible. Use the same wrapped check as today (it strips `__target` before lookup), so a target and an existing action of the same code are tested as a self-pair. Do not restrict to maximal stacks: demand constraints are equalities, so an action must be placeable in a stack that does not also carry extra actions.

Include `y[S, l]` only where every member of `S` is eligible on `l`.

```
for each land cover l:
    sum over S of y[S, l]  <=  area(l)

for each existing action e:
    sum over (S containing e, l) of y[S, l]  ==  area(e)

maximise:
    sum over (S containing target, l) of y[S, l]
```

Notes:

- The result is exact: any feasible solution is a real arrangement of the actions on the land.
- Per-action placement for the explanation code is the sum of `y[S, l]` over stacks containing that action, per land cover. Map back to the shape `explanation-derivation.js` expects before changing anything there; check what that file reads from the solver result before assuming a change is needed.
- Designation zones need no special handling: the effective land covers are the `l` above, and eligibility per zone is already in the eligibility map.
- Size: the number of stacks is bounded by 2^k, where k is the largest set of mutually compatible actions on the parcel. Eight mutually compatible actions give at most 255 stacks. Cap the number of actions at 16, log when the cap is hit, and fall back to the clique LP.

#### Worked example 1 — compatible pair

Parcel: one land cover, 10 ha, every action eligible. Existing: B 6 ha, C 6 ha. Compatibility: B–C only. Target: A, compatible with neither.

Stacks: {A}, {B}, {C}, {B, C}.

```
y_B + y_BC = 6
y_C + y_BC = 6
y_A + y_B + y_C + y_BC <= 10
maximise y_A
```

The best solution puts all of B and C together: y_BC = 6, y_B = y_C = 0, so y_A = 4. **Available: 4 ha.** (Clique LP: 4 ha.)

#### Worked example 2 — compatibility is not transitive

Same parcel and existing actions. Compatibility: A–B and B–C. A is the target.

Stacks: {A}, {B}, {C}, {A, B}, {B, C}. There is no {A, C} and no {A, B, C}.

A can share with B but not with C. B and C together can use at most 6 ha of the parcel because both must be fully placed and B is 6 ha. Whatever the arrangement, A gets at most 4 ha:

- y_BC = 6 (B and C fully together): A has the remaining 4 ha → y_A = 4.
- y_BC = 2, y_C = 4, y_AB = 4: footprint is 2 + 4 + 4 = 10, y_A = 0, A total = 4.

**Available: 4 ha, not 10.** Both LPs give this. Keep it as a regression test: a shortcut that lets A inherit B's compatibility with C would return 10.

---

## 5. Extension points for supplemental actions

Supplemental actions (LGA-008 Part 1) reuse this engine without changing the rules above. The seams:

- **Model.** The same normalisation pass can build a `basesOf(code)` index from the `SUP*` rows. The pairwise indexes here are untouched.
- **Check order.** The base-present check slots in at position 3.
- **Containment.** In the clique LP, a supplement is held inside its bases with one constraint per supplement and land cover: `x[s, l] <= sum over bases b of x[b, l]`. In the stack LP it falls out of the enumeration: drop any stack that contains a supplement but none of its bases.
- **Supplement-to-supplement compatibility.** Rows from the RPA supplement matrix (`SUPCO`) go into the `compatible` set like `BASECO` rows. That is the only change needed for GRH7, GRH8, GRH10 and SPM3 to share base land.
- **Pseudo-supplements (`SUPAGR`).** Not measured in area. They never enter the area LP.

---

## 6. Build plan

Each step ships on its own.

1. **Index the matrix.** Replace the `Array.some` scan with the `Set` model, built per ingest (or per request at minimum). Normalisation rules 1, 3 and 4. No behaviour change, except that it is faster. Add the `relationship_type` column and transformer field at the same time.
2. **Parcel-exclusive check.** Add normalisation rule 2, `isParcelExclusive`, the check at order position 2, and the `PARCEL_EXCLUSIVE` reason code. This is the first behaviour change.
3. **Stack LP (optional).** Only if there is evidence it is needed: a real parcel with a five-cycle, or overlapping bases over-offering in the supplemental work. Keep the clique LP as the fallback above 16 actions.

### Test plan

The scenarios in LGA-008 (ST-01 to ST-14) are the source of truth. Inject a policy fixture in unit tests; do not read the live matrix.

| Area | Cases |
| --- | --- |
| Coexistence | no matrix rows; one compatible pair; pair with two existing; non-transitive chain; existing actions that cannot all be placed; no self-stacking without a self row; self-stacking with a self row |
| Normalisation | row in one direction only; `BASECO` and `BASEPA` for the same pair; duplicate rows with different types |
| Parcel-exclusive | exclusive action on this parcel (fail); on another parcel only (pass) |
| Stack LP (if built) | five-ring (1.0 ha, not 2.8); the two worked examples above; cap at 16 actions falls back |

Properties worth generating:

- **Monotonic.** Adding an incompatible existing action never increases the available area.
- **Order-free.** Shuffling the existing actions, or swapping `(a, b)` in matrix rows, never changes the result.
- **Whole-application.** If every action in an application passes validation with the others held at their requested areas, a single LP with all of them as demand is feasible.

---

## 7. Open questions

These are tracked in LGA-008. Until answered, the behaviour above is the default.

- Does `BASEPA` really mean "not compatible at parcel level", or is it a general compatibility marker? The RPA describes it as the latter and as little used. Confirm before step 2.
- Should `BASEPA` beat `BASECO` for a pair that has both?
- Is step 3 needed at all?
