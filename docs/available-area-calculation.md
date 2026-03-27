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

### 4. Land Cover Generalization

To mitigate poor-quality mapping data, a pre-processing step is required. If a specific land cover code is recorded where a class code should be, the service must map it to the broader class before calling the AAC.

- _Example: If an action is valid on "Arable" land (Class 110), the calculation treats any area marked with a specific "Wheat" code as valid Arable land._

---

## Outputs

1.  **Primary Output:** A single numerical value representing the **Maximum Available Area** (in hectares) for the Target Action.
2.  **Secondary Output (Transparency):** A breakdown of the ephemeral **Stacks** derived during the calculation. This data is provided to help users or administrators understand the logic used to reach the primary numerical result.
