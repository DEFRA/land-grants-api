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
`POST /api/v2/parcels/supplements` with the `sbi`, the parcel, the base action,
the supplements selected so far and the other actions selected on the parcel
(`plannedActions`, as for `/parcels`). It needs the `X-Forwarded-Authorization`
header too, to read the business's agreements. Each supplement of the base we
offer (enabled and displayed) is returned, shaped as `/parcels` shapes actions.

A supplement's availability is the smaller of two figures:

- **What the parcel has left for it.** The available area calculation runs as
  it does for `/parcels`, with the supplement as the target and every other
  action competing for its land: the base, other base actions, the other
  selected supplements and the existing agreements. So a base action that can
  share the base's land but not the supplement's (CAGF1 next to CLIG3, for
  GRH7) takes its area away from the supplement.
- **What the base action has left for it.** A supplement sits within its base,
  so the calculation runs again over the base action's area alone, with the
  other selected supplements on it. Supplements with a `SUPCO` row can stack;
  those without one cannot overlap, but can sit side by side. For example, on
  10 ha of CLIG3, GRH7 on 6 ha leaves 4 ha for GRH8, while GRH11, which stacks
  with GRH7, still has the whole 10 ha.

The supplement's own selection is left out of both, so its availability is the
most it could cover. A supplement with nothing left is unavailable
(`no-availability`).

Like `/parcels`, it reports what is available and does not judge the quantities
selected, so grants-ui calls it again after each change. Checking that a
supplement's quantity fits its available area is a job for
`POST /api/v2/application/validate`, the final check of the application. The
only check made on `selectedSupplements` is that each one is a supplement of the
base action (400 otherwise). An entry in `plannedActions` for the base action or
a selected supplement is ignored, as those are given on their own.

### Compatibility types

The available area calculation reads `BASECO`, `SUPBAS` and `SUPCO` rows: two
actions can overlap when any of them relates the pair, and must be kept apart
when none does. `SUPCO` rows only relate supplements, so loading them changes
nothing for base actions.
