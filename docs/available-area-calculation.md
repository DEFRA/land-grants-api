## Available Area Calculation (AAC)

- [Back home](../readme.md)

### AAC Process Diagram

```mermaid
flowchart
  land[Postgres Land DB]@{shape: cyl}
  agreement[Agreements]@{shape: cyl}
  appliedForAction[/Action code applied for/]
  parcelLandCovers[/Land Cover Areas for Parcel/]
  actionLandCovers[/Valid land covers for action/]
  existingActions[/Existing Actions/]
  getCovers[Get land covers for existing actions]
  calulateTotalValidLandCover[Calculate total area of valid land covers]
  filterExistingActions[Filter existing actions to ones that share a land cover with the applied for action]
  subtractExistingActionArea[Subtract area from existing actions that could be attributed to non-shared land covers]
  stackActions[Stack existing actions by compatibility]

  subtractStacks[Subtract the area of any stack containing an incompatible action]

  result[/Available area/]

  land-->actionLandCovers
  land-->parcelLandCovers
  agreement-->existingActions
  actionLandCovers-->calulateTotalValidLandCover
  parcelLandCovers-->calulateTotalValidLandCover
  appliedForAction-->filterExistingActions
  appliedForAction-->calulateTotalValidLandCover
  existingActions-->getCovers
  existingActions-->filterExistingActions
  getCovers-->filterExistingActions
  filterExistingActions-->subtractExistingActionArea
  subtractExistingActionArea-->stackActions
  calulateTotalValidLandCover-->subtractStacks
  stackActions-->subtractStacks
  subtractStacks-->result

```

The purpose of the Available Area Calculation (AAC) is to work out the number of hectares of a land parcel someone is able to apply a particular action on. Say an applicant has a 3 hectare land parcel, has already agreed to do action **A** on 1 hectare of the parcel, is applying for action **B** and **A** and **B** aren't compatible with each other, the AAC should return 2 hectares.

Some more AAC scenarios are detailed here:

![Available Area Calculation Scenarios](images/aac-scenarios.png)
