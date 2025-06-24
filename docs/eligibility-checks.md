## Eligibility checks

- [Back home](../readme.md)

When an applicant applies for an action to undertake on a land parcel (field), we need to determine their eligibility based on the data we have available. An example of eligibility criteria for the **SCR1: Create scrub and open habitat mosaics** action can be found in [this document](https://www.gov.uk/find-funding-for-land-or-farms/scr1-create-scrub-and-open-habitat-mosaics). This document contains this statement:

| Protected land                               | Eligibility                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| Sites of special scientific interest (SSSIs) | Ineligible - you must not enter any area that's designated as an SSSI into this action |

In this case, the API will need to check if there is an intersection between the land parcel and the SSSI map layer and reject the application if so.
