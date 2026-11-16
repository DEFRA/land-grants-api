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

- its availability is the base action's area, as a supplement sits on top of its
  base and can cover all or part of it
- it is unavailable (`exceeds-base-action-area`) when it is selected for more than
  the base action's area

Like `/parcels`, it reports what can be selected rather than rejecting the
selection, so grants-ui calls it again after each change. The final check of
the application is still `POST /api/v2/application/validate`.

Supplements that cannot overlap (no `SUPCO` row between them) can still share
the base action's area side by side, for example GRH7 on 6 ha and GRH8 on 4 ha
of a 10 ha CLIG3. Selected supplements do not yet reduce each other's
availability; that, and the matching check in `/application/validate`, is a
follow-up story.
