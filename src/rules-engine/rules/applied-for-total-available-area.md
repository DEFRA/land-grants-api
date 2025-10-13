# applied-for-total-available-area

## What does this rule check?

This ensures the area applied for is exactly equal to the available area for this parcel/action
combination.

## Configuration parameters

None.

## Why and for whom would it fail?

This rule should never fail for external users as part of the application process, the UI shouldn't
allow the user to input any value.

It could fail if and data used to calculate available area changes after application is submitted.
This could include parcel boundaries, land covers and existing agreements on the land parcel.

## What remediation is possible if it does fail?

There are two possible ways to fix this - by updating the application amount (not possible on day 1) or by fixing the source data used to calculate available area.

##
