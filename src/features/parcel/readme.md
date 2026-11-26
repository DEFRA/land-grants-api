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
action we offer, that is one that is enabled and displayed, supplemental only
actions included.

It does not list actions configured as supplemental only (`isSupplementalOnly`
in the action config). They are offered under their base action rather than on
their own, so an availability figure for the whole parcel would mislead. They
still compete for land when they are among the `plannedActions`. A supplement
not configured as supplemental only can also be taken on its own, so
`/parcels` lists it as usual.

Once the applicant has picked such a base action, grants-ui calls
`POST /api/v2/parcels/supplements` with the `sbi`, the parcel, the code of the
one base action to list the supplements of (`baseActionCode`), and every action
selected on the parcel so far (`plannedActions`, as for `/parcels`): the base
actions, other actions such as CAGF1, and the supplements already selected,
each with the base action it sits on (`baseActionCode`). It needs the
`X-Forwarded-Authorization` header too, to read the business's agreements.

```json
{
  "sbi": "106284736",
  "parcelId": "SD6743-6292",
  "baseActionCode": "CLIG3_26",
  "plannedActions": [
    { "actionCode": "CLIG3_26", "quantity": 4.5713, "unit": "ha" },
    {
      "actionCode": "GRH7_26",
      "quantity": 2.5713,
      "unit": "ha",
      "baseActionCode": "CLIG3_26"
    },
    { "actionCode": "CAGF1", "quantity": 3, "unit": "ha" }
  ]
}
```

The response gives the base action asked about (`baseActionCode`) and each
supplement of it that we offer (enabled and displayed), shaped as `/parcels`
shapes actions, without `hasSupplements`.

A supplement's availability is the smaller of two figures:

- **What the parcel has left for it.** The available area calculation runs as
  it does for `/parcels`, with the supplement as the target and every other
  planned action competing for its land: the base actions, other actions, the
  other supplements and the existing agreements. So a base action that can
  share the base's land but not the supplement's (CAGF1 next to CLIG3, for
  GRH7) takes its area away from the supplement.
- **What its base action has left for it.** A supplement sits within its base
  action, so the calculation runs again over the area of the base action asked
  about, with the other planned supplements on it. Supplements with a
  `SUPCO` row can stack; those without one cannot overlap, but can sit side by
  side. For example, on 10 ha of CLIG3, GRH7 on 6 ha leaves 4 ha for GRH8,
  while GRH11, which stacks with GRH7, still has the whole 10 ha.

The supplement's own entry in `plannedActions` counts in both, as an action's
does on `/parcels`, so its availability is what is left for it on top of what
is already selected: GRH7 selected on the whole base action has nothing left.
The figure from its base action is worked out first and given to the
`/parcels` calculation as a cap on the supplement (`availableAreaCapSqm`), so
the supplement is then reported exactly as `/parcels` reports an action with
that availability: a supplement with nothing left is unavailable
(`no-availability`), and its rules run only when it has some. The API does not
share a base action out between its supplements: with nothing selected, GRH7
and GRH8 are each offered the whole base, and once some is selected, each is
offered what is left.

A base action whose quantity is more than the parcel can take, given the other
planned actions, leaves its supplements nothing, as the planned actions do not
fit.

Like `/parcels`, it reports what is available and does not reject the
quantities selected, so grants-ui calls it again after each change. A selection
that does not fit leaves the supplement nothing. The quantities are
checked by `POST /api/v2/application/validate` (see below). The request is
rejected (400) when the base action is not in `plannedActions`, or is not given
as an area greater than zero, in `ha` or `sqm`: supplements sit on their base
action's area. It is also rejected when a planned action's `baseActionCode` is not
in `plannedActions`, or is not one of its `SUPBAS` bases. A base action we do
not offer is a 404.

A supplement can have several base actions: SPM3 sits on CLIG3 or on AGF1. A
planned supplement sits on the base action its `baseActionCode` names; one without
`baseActionCode` is taken to sit on the base action asked about, when it is one of
its bases. Only the supplements on the base action asked about share its area;
those on another base action leave it alone, but still compete for the
parcel's land. So with CLIG3 on 4 ha and AGF1 on 3 ha, SPM3 is offered 4 ha
when CLIG3 is asked about, and 3 ha when AGF1 is.

### Validating supplements

`POST /api/v2/application/validate` checks each supplement against the same two
figures:

- **The parcel.** The supplement's own configured rule
  (`applied-for-total-or-partial-available-area`) runs the parcel-level
  calculation, with every other action applied for on the parcel and the
  existing agreements competing for its land.
- **The base action.** Two checks are added to every supplement, whatever its
  configured rules, because they come from the compatibility matrix:
  - `supplement-has-base-action`: one of its `SUPBAS` bases is applied for on
    the same parcel.
  - `supplement-within-base-action-area`: its quantity fits within what its base
    actions have left for it, once the other supplements on them have their
    share. This is the calculation `/parcels/supplements` uses
    (`findAvailableAreaWithinBaseActions`). A supplement with several of its
    bases on the parcel can use all of them; their areas are taken to be
    separate.

The checks run for supplements measured by area; a supplement fails when any of
its rules or checks fails.

### Compatibility types

The available area calculation reads `BASECO`, `SUPBAS` and `SUPCO` rows: two
actions can overlap when any of them relates the pair, and must be kept apart
when none does. `SUPCO` rows only relate supplements, so loading them changes
nothing for base actions.
