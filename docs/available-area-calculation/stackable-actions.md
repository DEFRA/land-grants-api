# Stackable Actions

How the API decides which actions can share the same ground, and how that affects the available area we tell a farmer they have left.

**Status.** "How it works today" describes `main`. "What we want to change" depends on LDR LGA-008, which is still proposed. If this document and LGA-008 disagree, LGA-008 wins and this document is wrong.

**Background reading (optional).** `aac-explained.md` explains the available area calculation (AAC) in plain terms. You don't need it to follow this page.

---

## 1. The idea in one minute

A farmer can apply for several actions on one parcel of land. Some actions can be done on the **same ground at the same time**, for example a hedgerow action and a grassland action. Others can't, because they ask for incompatible things (you can't both leave a field unfertilised and cut it for silage).

- **Stackable** (or **compatible**): two actions can share the same area. Both are paid in full and neither uses up the other's land.
- **Not stackable** (or **incompatible**): both actions can be on the parcel, but each needs its own separate ground.

A **stack** is a group of actions sitting on one piece of ground. A stack is valid only if every pair of actions inside it is stackable.

**Why the API cares.** When a farmer asks "how much of this parcel can I put action X on?", the answer is the parcel's eligible area minus the ground already taken by actions that X *can't* share with. Stackable actions don't reduce the answer. Non-stackable ones do.

### Example

A parcel has 10 ha of grassland. The farmer already has action B on 6 ha.

| Is X stackable with B? | Available area for X |
| --- | --- |
| Yes | 10 ha (X can sit on top of B) |
| No | 4 ha (only the ground B isn't using) |

### Not the same thing: supplemental actions

A **supplemental** action is an add-on that only exists on top of a base action (for example GRH7 on CLIG3). It follows different rules and is covered in LGA-008 Part 1, not here. It does reuse the engine described below; see [section 6](#6-where-supplemental-actions-plug-in).

---

## 2. The rules

1. **Stackability is decided pair by pair.** A stack is valid only if every pair in it is listed as stackable. There is no "this whole group is fine" permission.
2. **It is not transitive.** If A–B are stackable and B–C are stackable, that says nothing about A–C. A stack of {A, B, C} needs all three pairs listed.
3. **No entry means not stackable.** The RPA confirms this reading.
4. **An action usually can't stack with itself.** A second CLIG3 can't sit on top of the first. The exception is any action that has a row pairing it with itself: today only `CIPM1` and `CNUM1`. Don't hard-code "never with itself".
5. **A few pairs can't be on the same parcel at all**, even on different ground. These are rare. They are checked *before* the area calculation, not inside it.

---

## 3. The data: the compatibility matrix

The RPA publishes a table of action pairs. We load it from `src/land-data/compatibility_matrix/compatibility-matrix.csv` into the `compatibility_matrix` table. The 2026 file has about 31,800 rows covering 559 action codes.

Each row has an action code, a second action code, a year, and a **type** that says what the relationship is:

| Type | Meaning | Relevant here? |
| --- | --- | --- |
| `BASECO` | The two actions can share the same area | **Yes.** This is "stackable" |
| `BASEPA` | The two actions can't be on the same parcel | **Yes.** This is "parcel-exclusive" |
| `SUPBAS`, `SUPBPA`, `SUPAGR` | Supplement-to-base relationships | No. Supplemental work only |

Things that are true of the 2026 file and that the code can rely on:

- Every `BASECO` and `BASEPA` row has a mirror row (A→B and B→A), so a pair can be treated as unordered.
- `SUP*` rows have **no** mirror. Anything that looks rows up by the first action code alone will miss them.
- The only self-pairs are `CIPM1`–`CIPM1` and `CNUM1`–`CNUM1`.
- Some pairs have two rows with different types (39 pairs), so a row is identified by action, partner, type and year, not by the pair alone.
- Some pairs have both a `BASECO` and a `BASEPA` row (for example GS1A/SI1A, in both directions). We assume `BASEPA` wins. This is an open question (section 7).

---

## 4. How it works today

### Looking up a pair

`src/features/available-area/compatibilityMatrix.js` returns a function `(action1, action2) => boolean`. It scans every loaded row looking for the pair in either direction.

### Using it

`findMaximumAvailableArea` in `src/features/available-area/availableArea.js` is the only caller. In outline:

1. Combine the actions already on the parcel (agreements plus other actions in the same application), adding up areas per action code.
2. Rename the action being checked to `<code>__target` so it isn't confused with an existing action of the same code. The lookup strips the suffix. This is why a second CLIG3 is blocked by an existing CLIG3: the lookup is `(CLIG3, CLIG3)`, and there is no row.
3. Build a graph of which actions *can't* share, and find the groups of mutually-incompatible actions (maximal cliques).
4. Set up a linear program (LP): each existing action must be fully placed on land it is eligible for, and within each group of mutually-incompatible actions the placements on any land cover can't exceed that land cover's area.
5. Maximise the area the target action can take. That is the available area.

"Land cover" here already accounts for SSSI and historic-feature zones, which are split out beforehand.

### Known problems

| # | Problem | Effect |
| --- | --- | --- |
| 1 | The row **type** is thrown away on load, so `BASEPA` ("can't be on the same parcel") is read as "can share ground" | A parcel-exclusive action is offered area it shouldn't get. Example: AB2 on a parcel that already has RP32 |
| 2 | Looking up a pair scans every row | Slow, and gets worse as the number of actions on a parcel grows |
| 3 | The "groups of incompatible actions" approach is only exact if the incompatibility graph has no odd cycle of five or more | In rare layouts the area is overstated (2.8 ha reported where 1.0 ha is true). **Never seen on real data** |

---

## 5. What we want to change

### 5.1 A fast lookup that knows about types

Build the data once and reuse it:

```js
/**
 * @typedef {object} CoexistenceModel
 * @property {(a: string, b: string) => boolean} isCompatible       // may share the same area
 * @property {(a: string, b: string) => boolean} isParcelExclusive  // may not share a parcel
 */
```

How to build it, applied once when the matrix is loaded:

1. `BASECO` in either direction makes the pair compatible.
2. `BASEPA` in either direction makes the pair parcel-exclusive. If the same pair is also `BASECO`, **parcel-exclusive wins** and we log a warning naming the pair.
3. A self-pair is compatible only if a `BASECO` self row exists.
4. A pair with no `BASECO` row is incompatible.
5. `SUP*` rows are ignored here.

Implementation notes:

- Store pairs in a `Set`, keyed `` `${min}|${max}` `` using the sorted codes. Keep one set for compatible pairs and one for parcel-exclusive pairs.
- `isCompatible(a, b)` is `compatible.has(key) && !parcelExclusive.has(key)`.
- The model is a pure function with no database access. The AAC still takes it as `CompatibilityCheckFn`, so `findMaximumAvailableArea` doesn't change shape.
- Add a `relationship_type` column to `compatibility_matrix` (`VARCHAR(10) NOT NULL`, check-constrained to the types we ingest). Copy `TYPE` into it in `src/features/land-data-ingest/sql/compatibility_matrix/insert_compatibility_matrix.sql` (which currently inserts only code, partner, year and ingest id) and expose `relationshipType` from `src/features/compatibility-matrix/transformers/compatibility-matrix.transformer.js`.
- Build the model once per ingest (`ingest_id`) and cache it, invalidating when a new ingest completes. If per-ingest caching isn't possible yet, building per request with the `Set` is still much better than scanning rows.
- `getCompatibilityMatrix` (`src/features/compatibility-matrix/queries/getCompatibilityMatrix.query.js`) currently filters `WHERE option_code = ANY ($1)`. That is enough for `BASECO` and `BASEPA` (both directions are stored) but **not** for `SUP*`. If supplemental work will use the same loader, filter on `option_code = ANY ($1) OR option_code_compat = ANY ($1)`.

### 5.2 A parcel-exclusive check

Runs before the area calculation. For the target action and every other action on the same parcel (agreements plus the rest of the application):

- If `isParcelExclusive(target, existing)` is true for any existing action, fail with reason `PARCEL_EXCLUSIVE`, name the clashing action, and return 0 ha.
- A clashing action on a *different* parcel doesn't count.

Order of checks, most basic first:

| Order | Check | Reason code |
| --- | --- | --- |
| 1 | Is there eligible land after SSSI/historic-feature exclusions? | `NO_ELIGIBLE_LAND` |
| 2 | **Is any action on this parcel parcel-exclusive with the target?** | `PARCEL_EXCLUSIVE` |
| 3 | Is the base action present? (supplemental work) | `BASE_MISSING`, `BASE_NOT_IN_APPLICATION` |
| 4 | Can all existing actions still be placed? | `EXISTING_INFEASIBLE` |
| 5 | Is the requested quantity within the available area? | `FULLY_OCCUPIED`, `EXCEEDS_AVAILABLE` |
| 6 | Total-area-only actions | existing rule |

### 5.3 Optional: a more exact area calculation

Fixing problem 3 means replacing the "groups of incompatible actions" constraints with one variable per valid stack. **Only do this if problem 3 shows up on real data**, or if overlapping base actions over-offer area in the supplemental work.

**The contract** both versions must meet:

> Given the existing actions placed in full, each only on land covers it is eligible for, and each land cover's area shared only by actions in valid stacks, return the maximum area the target can occupy.

**Stack LP.** Let `y[S, l]` be the area of land cover `l` that carries exactly the set of actions `S`.

- Enumerate every non-empty subset `S` of the actions (existing plus the labelled target) in which every pair is compatible. Use the same wrapped check as today, so the target and an existing action with the same code are tested as a self-pair. Include non-maximal subsets too: an action must be placeable without also carrying extras.
- Include `y[S, l]` only where every member of `S` is eligible on `l`.

```
for each land cover l:
    sum over S of y[S, l]  <=  area(l)

for each existing action e:
    sum over (S containing e, l) of y[S, l]  ==  area(e)

maximise:
    sum over (S containing target, l) of y[S, l]
```

- The result is exact, because every feasible solution is a real arrangement of actions on the land.
- Per-action placement for `explanation-derivation.js` is the sum of `y[S, l]` over stacks containing that action. Check what that file actually reads from the solver result before assuming it needs changing.
- SSSI and historic-feature zones need no special handling: the effective land covers are the `l` above.
- Size is bounded by 2^k stacks, where k is the largest set of mutually compatible actions. Cap at 16 actions, log when the cap is hit, and fall back to the clique LP.

#### Worked example 1: a compatible pair

One 10 ha land cover, every action eligible. Existing: B 6 ha and C 6 ha. B and C are stackable. The target, A, is stackable with neither.

Valid stacks: {A}, {B}, {C}, {B, C}.

```
y_B + y_BC = 6
y_C + y_BC = 6
y_A + y_B + y_C + y_BC <= 10
maximise y_A
```

Best case: put B and C together (y_BC = 6), leaving y_A = 4. **Available: 4 ha.**

#### Worked example 2: stackability is not transitive

Same parcel and existing actions. A–B are stackable and B–C are stackable. A is the target.

Valid stacks: {A}, {B}, {C}, {A, B}, {B, C}. There is no {A, C} and no {A, B, C}.

A can sit on B but not on C. Whatever the arrangement, A gets at most 4 ha:

- B and C fully together (y_BC = 6): A takes the remaining 4 ha.
- y_BC = 2, y_C = 4, y_AB = 4: footprint 2 + 4 + 4 = 10, so A's total is 4.

**Available: 4 ha, not 10.** Keep this as a regression test: a shortcut that lets A inherit B's compatibility with C would return 10.

---

## 6. Where supplemental actions plug in

Supplemental actions (LGA-008 Part 1) reuse this engine without changing the rules above.

- **Model.** The same load step can build a `basesOf(code)` index from the `SUP*` rows. The pair sets above are untouched.
- **Check order.** The "base present" check goes at position 3.
- **Containment.** In the clique LP, a supplement must sit inside its bases: one constraint per supplement and land cover, `x[s, l] <= sum over bases b of x[b, l]`. In the stack LP it falls out of the enumeration: drop any stack containing a supplement but none of its bases.
- **Supplement-to-supplement compatibility.** Rows from the RPA supplement matrix (`SUPCO`) go into the `compatible` set like `BASECO`. That is all GRH7, GRH8, GRH10 and SPM3 need to share base land.
- **Pseudo-supplements (`SUPAGR`).** Not measured by area, so they never enter the LP.

---

## 7. Build plan, tests and open questions

### Build plan

Three steps. Each one can be merged on its own, in this order. Steps 1 and 2 are the agreed work. Step 3 is only if we need it.

**Step 1: Make the lookup fast and keep the row type (no change in behaviour)**

What to do:
1. Add a `relationship_type` column to the `compatibility_matrix` table, and fill it from the CSV's `TYPE` column during ingest.
2. Return it from the transformer as `relationshipType`.
3. When the matrix is loaded, turn the rows into a `Set` of compatible pairs (see section 5.1) instead of keeping a list of rows.
4. Make `createCompatibilityMatrix` answer from the `Set`. It must still return the same `(action1, action2) => boolean` function.

Done when: every existing test passes with the same results as before, and the code no longer scans every row for each pair.

For now, still treat `BASEPA` rows the way the code does today. Changing that is step 2.

**Step 2: Block parcel-exclusive actions (first behaviour change)**

What to do:
1. In the new lookup, record `BASEPA` pairs separately as "parcel-exclusive". If a pair is both `BASECO` and `BASEPA`, it is parcel-exclusive and not compatible. Log a warning.
2. Before the area calculation, check the target action against the other actions on the same parcel. If any of them is parcel-exclusive with it, stop and return 0 ha with the reason `PARCEL_EXCLUSIVE` and the code of the clashing action.
3. Put this check second in the order (see the table in section 5.2).

Done when: AB2 on a parcel that already has RP32 returns 0 ha and `PARCEL_EXCLUSIVE`, and AB2 with RP32 only on a *different* parcel still works normally.

Before you start, check the first open question in section 7 (what `BASEPA` really means) has been answered.

**Step 3: Exact stack calculation (optional)**

Don't start this unless we have a real parcel where the current calculation gives the wrong answer (problem 3 in section 4), or the supplemental work needs it. If you do build it, follow section 5.3, and if a parcel has more than 16 actions, use the current calculation instead.

### Test plan

LGA-008 scenarios ST-01 to ST-14 are the source of truth. Unit tests inject a policy fixture rather than reading the live matrix.

| Area | Cases |
| --- | --- |
| Coexistence | no matrix rows; one compatible pair; pair with two existing; non-transitive chain; existing actions that can't all be placed; no self-stacking without a self row; self-stacking with a self row |
| Normalisation | row in one direction only; `BASECO` and `BASEPA` for the same pair; duplicate rows with different types |
| Parcel-exclusive | exclusive action on this parcel (fail); on another parcel only (pass) |
| Stack LP (if built) | five-ring gives 1.0 ha not 2.8; the two worked examples; cap at 16 actions falls back |

Properties worth generating:

- **Monotonic.** Adding an incompatible existing action never increases the available area.
- **Order-free.** Shuffling the existing actions, or swapping `(a, b)` in matrix rows, never changes the result.
- **Whole-application.** If every action in an application passes validation with the others held at their requested areas, a single LP with all of them as demand is feasible.

### Open questions

Tracked in LGA-008. Until answered, the behaviour above is the default.

- Does `BASEPA` really mean "can't be on the same parcel", or is it a general marker? The RPA describes it as the latter and as little used. Confirm before step 2.
- Should `BASEPA` beat `BASECO` for a pair that has both?
- Is step 3 needed at all?
