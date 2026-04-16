# Available Area Calculation (AAC) Functional Specification

## Overview

The **Available Area Calculation (AAC)** determines the maximum possible area within a land parcel available for a specific new "Action."

Because certain environmental actions can coexist on the same piece of ground, the AAC evaluates the land parcel's composition and the compatibility of its existing commitments to find an arrangement that "clears" the largest possible area for the new request.

---

## Key Terms

- **Land Parcel:** A defined unit of land (e.g., a field) which may already be subject to existing environmental actions.
- **Land Cover:** The physical usage of the land. Due to data quality variations, the AAC maps specific **Land Cover Codes** (e.g., Winter Wheat) to broader **Land Cover Class Codes** (e.g., Arable) to determine eligibility.
- **Action:** A specific set of environmental operations. Each action is governed by compatibility rules and eligibility rules.
- **Stack (Ephemeral):** A computational construct representing a collection of compatible actions allocated to the same area of land.
  > **Note:** Stacks are used exclusively as an internal calculation tool to derive the maximum area; they are not real-world entities, are not stored in the final agreement, and are not displayed in the primary user interface.

---

## Input Data

| Input                                      | Description                                                                                                                                                                                   |
| :----------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Target Action**                          | The code for the new action the applicant is currently requesting.                                                                                                                            |
| **Existing Actions**                       | A list of actions already active on the parcel, including their total area in hectares (ha).                                                                                                  |
| **Action Eligibility Rules**               | A mapping of action codes to the Land Cover Class Codes they are valid for (e.g., `{"CMOR1": ["130"]}`).                                                                                      |
| **Compatibility Matrix**                   | A master reference defining pairs of action codes that are permitted to coexist (stack) on the same land.                                                                                     |
| **Parcel Composition**                     | The total area of each Land Cover Class present within the parcel.                                                                                                                            |
| **Parcel Composition (excluding SSSI/HF)** | The area of each Land Cover Class on the parcel after subtracting intersections with SSSI and Historic Feature designations. Pre-computed and provided alongside the full parcel composition. |
| **SSSI/HF Action Eligibility**             | A mapping indicating whether each action is eligible or ineligible for land designated as SSSI, Historic Features, or both.                                                                   |

---

## Logic & Constraints

### 1. Spatial Optimization (The "Geo-data" Gap)

A primary challenge for the AAC is the lack of specific geographic coordinates for existing actions. The system knows _how much_ area is covered, but not _where_ it is located within the parcel.

To address this, the AAC assumes a **best-case scenario**: it logically rearranges existing actions and "stacks" them wherever compatibility and land cover eligibility allow, specifically aiming to minimize their total "footprint" to leave the maximum possible room for the new action.

### 2. Eligibility Filtering

Before calculating overlaps, the AAC must filter the parcel area. An action (whether existing or target) can only be placed on land where the Land Cover Class Code matches the action's **Eligibility Rules**.

### 3. Fine-Grained Stack Splitting

To ensure the mathematical maximum is found, the calculation must be able to break down existing commitments into the smallest possible units. This "fine-grained" approach provides the necessary flexibility to explore all valid permutations of overlapping actions.

### 4. Unreliable land cover data

The mapping data for land covers on a parcel has some quality issues. In the field `landCoverClassCode` on the parcel's land cover, the number may actually be a land cover code. For the valid land covers for actions we have both `landCoverClassCode` and `landCoverCode` available. To avoid errors, when checking if an action may be applied to a particular land cover on the parcel we need to compare both `landCoverClassCode` and `landCoverCode`.

### 5. The importance of all land covers on the parcel

It is important to consider the valid land covers of all actions present on the parcel. Even existing actions that have no land cover in common with the applied for action can affect the available area for it. Consider the following example:

Applying for CMOR1

Existing actions:

- AA1 - 2.5 ha
- AA2 - 3 ha

None of the actions are compatible with each other.

Land covers on parcel:

- Grassland - 3.1 ha
- Woodland - 2.5 ha
- Arable - 1 ha

Valid land covers:

- CMOR1 - Grassland
- AA1 - Woodland, Arable
- AA2 - Woodland, Grassland

If AA1 is assigned to Woodland, it consumes all of it meaning that AA2 can only be assigned to Grassland, making the Available Area for CMOR1 0.1 ha.

If AA1 is assigned to Arable (1 ha), then to Woodland (1.5 ha) then there is 1 ha of woodland left for AA2 and so 1 ha more of Grassland for CMOR1 making the answer 1.1 ha.

### 6. Explanations

This is a very complicated calculation that has a significant effect on people's lives. To build trust in the calculation and to help inform decisions around it, explanations should be returned along with the primary result. This should include all major steps taken in working out the answer and the ephemeral 'stacks' that inform it.

### 7. Immutability of existing actions

The AAC must not alter the existing actions in any way - no filtering, capping etc. It can only rearrange them conceptually to find the optimal configuration for the new action. The existing actions' areas and eligibility rules remain fixed throughout the calculation.

This may lead to:

### 8. Error Handling

The AAC may encounter an impossible set of input parameters, in this case it should raise an error giving as much information as possible as to why the calculation failed. Failure scenarios:

- The areas of the existing actions can not be arranged on the land covers in a valid way.

### 9. SSSI and Historic Feature Constraints

Parts of a parcel may be designated as **Sites of Special Scientific Interest (SSSI)** or **Historic Features (HF)**. These are areas of ecological or archaeological significance that restrict which actions may be performed on them. The SSSI and HF layers may intersect with any of the land covers on a parcel.

#### Eligibility

Each action is either **eligible** or **ineligible** for SSSI/HF-designated land:

- **Eligible** actions may be placed on designated land without restriction. For these actions, the SSSI/HF layers have no effect on the AAC.
- **Ineligible** actions may never be placed on designated land. For example, CSAM3 (Herbal leys) is ineligible for both SSSI and HF because it could damage the ecosystem or archaeology.

#### Effect on the AAC

When the **target action is ineligible** for SSSI/HF, the AAC must reduce the target action's valid land covers to exclude the designated areas. Specifically:

- The **target action** uses the **parcel composition excluding SSSI/HF** to determine its available land covers.
- **Existing actions** (whether eligible or ineligible) continue to use the **full parcel composition** for their allocation. This is a simplifying assumption for the initial implementation.

This means the pool of land available to the target action is smaller, but existing eligible actions can still be placed on SSSI/HF land — and the optimisation should take advantage of this.

#### Extended allocation priority

The existing optimisation already prefers placing existing actions on land covers not valid for the target action (see point 5). When SSSI/HF constraints apply, the allocation priority for existing actions becomes a three-tier hierarchy:

1. **Covers not valid for the target action** — as before, these are the most preferred since they cannot reduce the target's available area regardless.
2. **SSSI/HF portions of covers valid for the target action** — the target action cannot use this land anyway (it is ineligible), so placing existing actions here does not reduce the available area.
3. **Non-SSSI/HF portions of covers valid for the target action** — this is the land the target action can actually use, so existing actions placed here directly reduce the available area. Minimise allocation to this tier.

#### Worked example

**Applying for:** CSAM3 (ineligible for SSSI and HF)

**Existing actions:**

- AA1 — 2 ha (eligible for SSSI and HF)

**Action compatibility:**

- AA1 is **not compatible** with CSAM3

**Valid land covers:**

- AA1: Arable, Pond
- CSAM3: Grass, Arable

**Parcel composition (full):**

| Land Cover | Area |
| :--------- | :--- |
| Grass      | 2 ha |
| Arable     | 2 ha |
| Pond       | 1 ha |

**Parcel composition (excluding SSSI/HF):**

| Land Cover | Area   |
| :--------- | :----- |
| Grass      | 1.5 ha |
| Arable     | 1.5 ha |
| Pond       | 0.8 ha |

The SSSI/HF intersection therefore covers 0.5 ha of Grass, 0.5 ha of Arable, and 0.2 ha of Pond.

**Step 1 — Allocate AA1 on full covers, preferring non-CSAM3 covers:**

AA1 (2 ha) is valid for Arable and Pond. Pond is not valid for CSAM3, so it is preferred:

- 1 ha on Pond (exhausts Pond)
- 1 ha on Arable

**Step 2 — Within shared covers, assume as much of AA1 as possible sits on SSSI/HF land:**

AA1 has 1 ha on Arable (a cover shared with CSAM3). The SSSI/HF intersection on Arable is 0.5 ha. Since AA1 is eligible for SSSI/HF, we assume 0.5 ha of its Arable allocation sits on the designated portion. The remaining 0.5 ha of AA1 on Arable competes with CSAM3.

**Step 3 — Calculate available area:**

Available area for CSAM3 = valid covers excluding SSSI/HF − incompatible existing action area on non-SSSI/HF shared covers

= (Grass 1.5 ha + Arable 1.5 ha) − 0.5 ha (AA1 on non-SSSI/HF Arable)

= **2.5 ha**

#### Initial implementation scope

The following simplifications apply to the first implementation:

- **Only CSAM3** is treated as ineligible for SSSI/HF. All other actions are considered eligible and are unaffected.
- **SSSI and HF are treated as a single combined layer** — there is no need to handle SSSI-only or HF-only ineligibility separately.
- **Existing actions always use the full parcel composition**, even if they are themselves ineligible for SSSI/HF. This will be revisited in a future iteration.

---

## Outputs

1.  **Primary Output:** A single numerical value representing the **Maximum Available Area** (in hectares) for the Target Action.
2.  **Secondary Output (Explanations):** A breakdown of the ephemeral **Stacks** derived during the calculation along with other steps taken to achieve the answer. This data is provided to help users or administrators understand the logic used to reach the primary numerical result.
3.  **Error Handling:** If the calculation encounters an unsolvable scenario (e.g., no compatible arrangements possible), it should return a clear error message indicating that the Available Area is effectively zero due to incompatibility or ineligibility.
