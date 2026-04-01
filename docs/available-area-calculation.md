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

| Input                        | Description                                                                                               |
| :--------------------------- | :-------------------------------------------------------------------------------------------------------- |
| **Target Action**            | The code for the new action the applicant is currently requesting.                                        |
| **Existing Actions**         | A list of actions already active on the parcel, including their total area in hectares (ha).              |
| **Action Eligibility Rules** | A mapping of action codes to the Land Cover Class Codes they are valid for (e.g., `{"CMOR1": ["130"]}`).  |
| **Compatibility Matrix**     | A master reference defining pairs of action codes that are permitted to coexist (stack) on the same land. |
| **Parcel Composition**       | The total area of each Land Cover Class present within the parcel.                                        |

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

---

## Outputs

1.  **Primary Output:** A single numerical value representing the **Maximum Available Area** (in hectares) for the Target Action.
2.  **Secondary Output (Explanations):** A breakdown of the ephemeral **Stacks** derived during the calculation along with other steps taken to achieve the answer. This data is provided to help users or administrators understand the logic used to reach the primary numerical result.
3.  **Error Handling:** If the calculation encounters an unsolvable scenario (e.g., no compatible arrangements possible), it should return a clear error message indicating that the Available Area is effectively zero due to incompatibility or ineligibility.
