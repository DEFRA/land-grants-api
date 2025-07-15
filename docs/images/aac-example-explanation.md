#### Example Explanation

The following is our first attempt to write an explanation for the available area calculation by hand. Something similar will be added as code.

```
Application Info
----------------

Action code - CMOR1
Parcel Id - SD8447 1509

Land Covers For Parcel
----------------------

Arable (110) - 7.9890 ha
Permanent Grassland (130) - 3.1539 ha
Hard Standing (551) - 0.0076 ha

Existing actions
----------------

CHRW1 - 10.0000 ha
CHRW2 - 8.0000 ha
CHRW3 - 7.0000 ha

Other actions on this application
---------------------------------

None

Applying for action
-------------------

CMOR1

Valid land covers for CMOR1
---------------------------

- Permanent Grassland (130)
- Rock (250)
- Heaps (270)

Total valid land covers
-----------------------

Permanent Grassland (130) - 3.1539 ha
= 3.1539 ha

Common land covers
------------------

CHRW1 has the following land covers in common with CMOR1:
- Heaps (270)

CHRW2 has the following land covers in common with CMOR1:
- Heaps (270)

CHRW3 has the following land covers in common with CMOR1:
- Heaps (270)

Actions included for stacking:
- CHRW1
- CHRW2
- CHRW3

Find area of existing action that must be on the same land cover as CMOR1
-------------------------------------------------------------------------

CHRW1 may be applied on the following land cover on SD8447 1509 that aren't valid for CMOR1:
- Arable (110) - 7.9890 ha
- Hard Standing (551) - 0.0079 ha

CHRW2 may be applied on the following land cover on SD8447 1509 that aren't valid for CMOR1:
- Arable (110) - 7.9890 ha
- Hard Standing (551) - 0.0079 ha

CHRW3 may be applied on the following land cover on SD8447 1509 that aren't valid for CMOR1:
- Arable (110) - 7.9890 ha
- Hard Standing (551) - 0.0079 ha

Area of land  that must be on the same land cover as CMOR1:
- CHRW1 2.0033 ha
- CHRW2 0.0034 ha
- CHRW3 0.0000 ha

Stacks
------

Stack 1 - CHRW1 & CHRW2. Area 0.0034 ha
Stack 2 - CHRW1, Area 2.0000 ha

Explanation:

  Adding CHRW3 (area 0 ha)
  Adding CHRW2 (area 0.003388135180179961 ha)
    Created Stack 1 for CHRW2 with area 0.003388135180179961 ha
  Adding CHRW1 (area 2.00338813518018 ha)
    CHRW1 is compatible with: CHRW2 in Stack 1
    Added CHRW1 to Stack 1 with area 0.003388135180179961 ha
    Created Stack 2 for CHRW1 with area 2 ha

Stack 1 is not compatible with CMOR1
Stack 2 is not compatible with CMOR1

Result
------

Total valid land cover:
3.1539 ha
- 0.0034 (Stack 1)
- 2.0000 (Stack 2)

= 1.1505 ha available for CMOR1 on SD8447 1509

```
