# Parcel

## Why zero-availability actions are still reported

`getActionsWithAvailability` returns every displayed action, including ones
whose available area or length has fallen to zero. It must not omit them.

The acceptance criterion — _given a land parcel has no available building area, do
not display the building-related action as an option for that parcel_ — is satisfied
by grants-ui, not here. Its `hasAvailableLand` / `isVisibleOnInitialLoad` filtering
applies to any action in any unit, but it only sees the current figure while this
endpoint keeps reporting the action.

`mergeRecomputedAvailability` in grants-ui overwrites an action's availability only
when it finds a matching code in this response. Omitting a now-zero action would
therefore leave its stale, previously-fetched availability in place rather than
updating it to zero — the action would still be shown, with the old figure.

## Supplements

`POST /api/v2/parcels` sets `hasSupplements` on an action when, in the latest
year of the compatibility matrix, it is the base (`SUPBAS`) of at least one
action we offer, that is one that is enabled and displayed.

Once the applicant has picked such a base action and its area, grants-ui calls
`POST /api/v2/parcels/supplements` with the parcel, the base action and the
supplements selected so far. Each supplement of the base we offer (enabled and
displayed) is returned,
shaped as `/parcels` shapes actions:

its availability is the base action's area, as a supplement sits on top of its
base and can cover all or part of it.

Like `/parcels`, it reports what is available and does not judge the quantities
selected, so grants-ui calls it again after each change. Checking that a
supplement's quantity fits its available area is a job for
`POST /api/v2/application/validate`, the final check of the application. The
only check made on `selectedSupplements` is that each one is a supplement of the
base action (400 otherwise).

Supplements that cannot overlap (no `SUPCO` row between them) can still share
the base action's area side by side, for example GRH7 on 6 ha and GRH8 on 4 ha
of a 10 ha CLIG3. Selected supplements, and the other actions on the parcel, do
not yet reduce a supplement's availability; that, and the matching checks in
`/application/validate`, are follow-up stories.
