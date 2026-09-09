# Action Display Availability

## The problem

Currently, the API response for `POST /api/v2/parcels` returns all displayable actions regardless of eligibility. The UI is responsible for filtering them out based on available area. When a new business rule (e.g., "GRH12 requires a parcel of at least 2ha") is introduced, enforcement only happens at application validation time — the user sees the action in the picker, attempts to apply, and gets an error message. This is poor UX and violates the principle that the API should be the single source of truth for eligibility.

The problem becomes more complex when business rules interact with calculated values:

- **Parcel-level rules** (min/max parcel size, data layer intersections) can be evaluated _before_ the user enters a quantity
- **Application-level rules** (applied-for quantity checks) can only be evaluated _when_ the user enters a quantity

Today there is no mechanism to distinguish these cases, so all rule enforcement defers to validation time.

## Proposed solution

### Part 1: API returns availability status

Rather than filtering unavailable actions from the response, the API returns all displayable actions and annotates each with an `available` boolean and (when false) an array of human-readable reasons:

```json
{
  "code": "GRH12",
  "description": "...",
  "available": false,
  "reasons": ["The parcel size is below the minimum configured parcel size 2 ha"],
  "availability": { "unit": "ha", "value": 0.0 },
  ...
}
```

- `available: true` (or field omitted) means the action _can_ be applied for on this parcel
- `available: false` means the action _cannot_ be applied, and `reasons` explains why
- Reasons cover both traditional cases (AAC = 0) and new rule-based eligibility failures

The UI greys out unavailable actions, displays the reason text, and prevents selection. Users understand why an action is unavailable rather than seeing a silent omission.

### Part 2: Rules declare their data dependencies

Each rule executor declares the data it needs via a `requires` array:

```js
export const minMaxParcelSize = {
  requires: [{ type: 'parcelSize' }],
  execute: (application, rule) => { ... }
}

export const parcelHasMoorlandIntersection = makeParcelHasIntersection('moorland')
// internally: { requires: [{ type: 'intersection', layer: 'moorland' }], ... }
```

A `resolveApplicationData` function collects all requirements from a set of rules, dedupes them, fetches only what is needed (in parallel), and folds the results into the application object before rule execution. This is the key to enabling automatic classification of rules.

### Part 3: Display-safe rules are identified by their data requirements

A rule is _display-safe_ if **all** of its declared requirements can be resolved _before_ the user has entered an application quantity. Two categories:

1. **Parcel-level requirements** (no provider needed):
   - `{ type: 'parcelSize' }` — fetched from the land parcel geometry
   - `{ type: 'intersection', layer: 'moorland' | 'lfa' | 'sssi' | 'historic_features' }` — fetched from data layer queries

2. **Semantic marker requirements** (no database fetch):
   - `{ type: 'appliedForQuantity' }` — marks rules that _cannot_ be evaluated at display time

A rule is _display-unsafe_ (validation-only) if it requires `appliedForQuantity`. Examples:

- `applied-for-total-available-area`: needs to know how much the user applied for
- `applied-for-total-or-partial-available-area`: same
- `available-length`: same

### Part 4: Display-time execution flow

When handling `POST /api/v2/parcels`, for each displayable action:

1. Filter `action.rules` to only display-safe rules (those with no `appliedForQuantity` requirement)
2. Call `resolveApplicationData(displaySafeRules, baseApplication, ctx)` — fetches required parcel data
   - Parallel, deduplicated fetches across the entire parcel's action list
   - Results folded into the application object
3. Execute display-safe rules via `executeRules(rules, application, displaySafeRules)`
4. Collect hard failures (rules where `passed: false` and no caveat):
   - Failure messages become entries in the action's `reasons` array
5. Separately, if AAC returns zero available area, add a reason for that too
6. Set `available: !(reasons.length > 0)`

**Important:** consent annotation rules (SSSI, HEFER) produce `caveat` results, not failures — they don't make an action unavailable, they annotate it with `sssiConsentRequired` or `heferRequired`. These continue to work as today.

---

## Existing rules: which are display-safe?

All rules in the system inherit their data requirements from the `requires` array on their executor. The PoC branch `data-requirements-for-rules` demonstrates this pattern. Below is the current status:

### Display-safe (parcel-level only)

| Rule                                      | `requires`                         | Notes                                                    |
| ----------------------------------------- | ---------------------------------- | -------------------------------------------------------- |
| `min-max-parcel-size`                     | `[parcelSize]`                     | New in PoC; gates GRH12 at display time                  |
| `parcel-has-moorland-intersection`        | `[intersection:moorland]`          | Split from generic in PoC; bakes layer into the executor |
| `parcel-has-lfa-intersection`             | `[intersection:lfa]`               | Split from generic in PoC                                |
| `parcel-has-sssi-intersection`            | `[intersection:sssi]`              | Split from generic in PoC                                |
| `sssi-consent-required`                   | `[intersection:sssi]`              | Annotation rule; doesn't gate availability               |
| `hefer-consent-required`                  | `[intersection:historic_features]` | Annotation rule; doesn't gate availability               |
| `parcel-within-max-moorland-intersection` | `[intersection:moorland]`          | Split from generic in PoC                                |

### Display-unsafe (need applied-for quantity)

| Rule                                          | `requires`             | Notes                                            |
| --------------------------------------------- | ---------------------- | ------------------------------------------------ |
| `applied-for-total-available-area`            | `[appliedForQuantity]` | Needs quantity to check if user applied for all  |
| `applied-for-total-or-partial-available-area` | `[appliedForQuantity]` | Needs quantity to check if within available      |
| `available-length`                            | `[appliedForQuantity]` | Needs quantity to check against available length |

### TBD (no `requires` declared yet)

| Rule                           | `requires`       | Status                                                   |
| ------------------------------ | ---------------- | -------------------------------------------------------- |
| `manual-check-required`        | _(not declared)_ | Needs discussion: does it gate display or just annotate? |
| `woodland-minimum-eligibility` | _(not declared)_ | Needs requirements defined                               |
| `woodland-total-area`          | _(not declared)_ | Needs requirements defined                               |

Rules without declared requirements should be treated conservatively as display-unsafe until `requires` is added, ensuring no actions incorrectly appear as available.

---

## Worked examples

### Example 1: GRH12 on a 1.2ha parcel

**Setup:**

- Parcel: 1.2ha (12,000 sqm)
- Action: GRH12 with rule `min-max-parcel-size` configured `minimumParcelSizeSqm: 20000`

**Display-time flow:**

1. Rule declares `requires: [{ type: 'parcelSize' }]` → display-safe
2. `resolveApplicationData` fetches parcel size: 12,000 sqm
3. `executeRules` runs `min-max-parcel-size`
4. Rule fails: `reason = "The parcel size is below the minimum configured parcel size 2 ha"`
5. Response:
   ```json
   {
     "code": "GRH12",
     "available": false,
     "reasons": [
       "The parcel size is below the minimum configured parcel size 2 ha"
     ],
     "availability": { "unit": "ha", "value": 0.0 }
   }
   ```

### Example 2: Moorland action (CMOR1) on a parcel with 0% moorland

**Setup:**

- Parcel: 50ha, 0% moorland intersection
- Action: CMOR1 with rule `parcel-has-moorland-intersection` configured for majority (>50%)

**Display-time flow:**

1. Rule declares `requires: [{ type: 'intersection', layer: 'moorland' }]` → display-safe
2. `resolveApplicationData` fetches moorland intersection: 0%
3. `executeRules` runs `parcel-has-moorland-intersection`
4. Rule fails: `reason = "This parcel is not majority on the moorland"` (or custom `failureMessage` if configured)
5. Response:
   ```json
   {
     "code": "CMOR1",
     "available": false,
     "reasons": ["This parcel is not majority on the moorland"],
     "availability": { "unit": "ha", "value": null },
     "sssiConsentRequired": false
   }
   ```

### Example 3: GRH12 on a 5ha parcel

**Setup:**

- Parcel: 5ha (50,000 sqm)
- Action: GRH12
- Existing agreements: 2ha

**Display-time flow:**

1. `min-max-parcel-size` rule passes (50,000 sqm ≥ 20,000 sqm)
2. AAC computes available area for new application: 3ha
3. `available: true`
4. Response:
   ```json
   {
     "code": "GRH12",
     "available": true,
     "availability": { "unit": "ha", "value": 3.0 }
   }
   ```

### Example 4: Applied-for quantity rule at validation time

**Setup:**

- User applies for 4ha of GRH12 on a parcel with only 3ha available
- Action has rule `applied-for-total-available-area` (display-unsafe)

**Display-time flow:** Action is shown as available because the rule is display-unsafe.

**Validation-time flow:**

1. User submits application with quantity = 4ha
2. `resolveApplicationData` is called with `{ type: 'appliedForQuantity', value: 4 }` in the context
3. `applied-for-total-available-area` rule runs, checks `4ha > 3ha available`
4. Rule fails with a user-friendly message
5. User corrects their entry

---

## Open questions for the team

### 1. Deduplication scope

`resolveApplicationData` dedupes requirements within a single call. When iterating over many actions on the same parcel, we call it multiple times. Should we add per-parcel memoisation so that (e.g.) moorland intersection is fetched once and reused across all actions?

**Trade-off:** Memoisation adds complexity but reduces DB queries. A parcel might have 30+ actions; fetching the same layer multiple times is wasteful.

### 2. Rules without declared requirements

`manual-check-required`, `woodland-minimum-eligibility`, and `woodland-total-area` do not have `requires` declarations in the PoC. How should we classify them?

**Option A (conservative):** Treat them as display-unsafe until `requires` is added. Actions with these rules are always available at display time.

**Option B (permissive):** Treat them as display-safe by default; add them to the display-safe pass. Risk: if a rule accidentally needs `appliedForQuantity`, it won't catch the error.

**Recommendation:** Option A (conservative) during migration, then migrate each rule's `requires` definition and reclassify.

### 3. Available area zero — what reason text?

When AAC returns zero, what reason should we add to the action?

**Option A:** Simple: `"No available area on this parcel for this action"`

**Option B:** Detailed: Include the explanation sections the AAC engine already generated (land covers, stacks, etc.)

**Option C:** Context-dependent: If a hard failure rule is also present, only show that rule's reason; only show AAC reason if display-safe rules pass but AAC = 0.

**Recommendation:** Option A for now (simplicity); we can enrich later if the UI design requires it.

### 4. Consolidating SSSI and HEFER annotation

Today, `getActionsForParcelWithSSSIConsentRequired` and `...HEFERConsentRequired` do a separate pre-pass to annotate actions with consent flags. With this approach, these rules would naturally run in the display-safe pass and set their caveats.

**Should we consolidate?** Probably yes, as a follow-up. It reduces duplication and makes consent rules behave the same as others.

### 5. Non-hectare actions (count, metres)

Count and metre actions currently bypass AAC. Should they also skip the display-safe rule pass, or should they participate?

**Option A:** Skip rule evaluation; always `available: true`. Simplest for now.

**Option B:** Participate in display-safe rule pass (e.g., a count action could have a parcel-size rule). Rules can gate non-ha actions too if needed.

**Recommendation:** Option B (more flexible). Non-ha actions should still be gatable by parcel-level rules if a business rule requires it in future.

### 6. Backwards compatibility

The current endpoint (`/api/v2/parcels`) is v2. Clients currently filter on `availability.value === 0`. The new `available` flag is additive.

**Breaking change?** The field is new, so clients that ignore unknown fields won't break. But clients that _rely_ on `value === 0` to detect unavailability will miss the new `available: false` cases.

**Recommendation:** This should be a documented change in the API release notes, but not a version bump. Clients should migrate to checking `available` as the canonical signal. We could add a sunset timeline for the old filtering pattern if needed.

---

## Implementation strategy (when approved)

This document is a proposal for team discussion. Once consensus is reached:

1. **Add `requires` definitions** to `applied-for-total-available-area`, `applied-for-total-or-partial-available-area`, `available-length` (and any others) to mark them as display-unsafe.

2. **Add `requires` definitions** to `manual-check-required`, `woodland-*` and confirm they are display-safe (or mark them display-unsafe if they reference applied-for quantity).

3. **Lift `resolveApplicationData` and requirement providers from the PoC branch** into `main`:
   - `src/features/rules-engine/data-requirements/data-requirements.d.js`
   - `src/features/rules-engine/data-requirements/providers.js`
   - `src/features/rules-engine/data-requirements/resolveApplicationData.js`

4. **Update `POST /api/v2/parcels`** in `parcel.service.js`:
   - Identify display-safe rules per action
   - Call `resolveApplicationData` per action (with per-parcel memoisation if decided)
   - Execute display-safe rules and collect failures
   - Add `available: boolean` and `reasons: string[]` to each action in the response

5. **Update schema** in `parcel.schema.js`:
   - Add `available` (required) and `reasons` (optional) to `actionSchema`

6. **Tests:**
   - Add tests for the display-safe filtering logic
   - Add tests for the interaction between AAC and display rules
   - Ensure backward-compatibility of non-ha actions

---

## References

- PoC branch: `data-requirements-for-rules` demonstrates the `requires` pattern and `resolveApplicationData` implementation
- Related files:
  - `src/features/rules-engine/rules.d.js` — defines `RuleExecutor` and `RequirementDescriptor`
  - `src/features/rules-engine/rules/1.0.0/*.js` — individual rule executors (will gain `requires` declarations)
  - `src/features/parcel/service/2.0.0/parcel.service.js` — where display-time rule evaluation will run
  - `src/features/parcel/schema/2.0.0/parcel.schema.js` — response schema to update
