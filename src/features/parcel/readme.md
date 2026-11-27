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

Once the applicant has picked such a base action, grants-ui calls
`POST /api/v2/parcels/supplements` with the `sbi`, the parcel, the code of the
one base action to list the supplements of (`baseActionCode`), and every action
selected on the parcel so far (`plannedActions`, as for `/parcels`): the base
actions, other actions such as CAGF1, and the supplements already selected,
each with the base action it sits on (`baseActionCode`). It needs the
`X-Forwarded-Authorization` header too, as `/parcels` does, to read the
business's agreements.

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
shapes actions, without `hasSupplements`. For now, a supplement's availability
is the base action's area in `plannedActions`, as a supplement sits on top of
its base and can cover all or part of it. The other planned actions, the
supplements selected and the existing agreements do not yet reduce it; that is
a follow-up.

Like `/parcels`, it reports what is available and does not reject the
quantities selected, so grants-ui calls it again after each change. The
quantities are checked by `POST /api/v2/application/validate`. The request is
rejected (400) when the base action is not in `plannedActions`, or is not given
as an area greater than zero, in `ha` or `sqm`: supplements sit on their base
action's area. It is also rejected when a planned action's `baseActionCode` is not
in `plannedActions`, or is not one of its `SUPBAS` bases. A base action we do
not offer is a 404.

### Validating supplements

`POST /api/v2/application/validate` checks each supplement measured by area
against its parcel and its base action, using the compatibility matrix's
`SUPBAS` rows:

- **Its area.** The supplement's configured
  `applied-for-total-or-partial-available-area` rule checks its quantity
  against the smaller of two figures, as `/parcels/supplements` reports it:
  - what the parcel leaves it: the parcel-level calculation, with every other
    action applied for on the parcel and the existing agreements competing for
    its land. On its own, this lets a supplement cover its base action's land,
    as the matrix lets them share it;
  - the area of its base actions applied for on the same parcel, in the same
    application. A supplement with several of its bases on the parcel can use
    all of them; with none, it has no area.

  The figure is capped at its base actions by the `AVAILABLE_AREA` data
  provider, for every supplement in the matrix, whatever its configured rules.
  Its explanations gain a "Base action" section saying so. The rule's reason is
  the usual one, "The amount of land must be the same as or less than the
  available area". `/parcels` is not held: it lists actions before anything is
  applied for.

- **Its base action.** The
  [`supplement-has-base-action`](../rules-engine/rules/1.0.0/supplement-has-base-action/supplement-has-base-action.md)
  rule, configured on each supplement in grants-config-land-grants, checks that
  one of its base actions is applied for on the same parcel, in the same
  application. A base action held only in an existing agreement does not
  count. The reason names the base actions, e.g. "GRH7_26 requires the base
  action CLIG3_26 on the same land parcel". It needs what is applied for, so
  `/parcels` doesn't run it.

A supplement fails when any of its rules fails. For now, each supplement is
capped at the whole of its base action: supplements that cannot overlap, such as
GRH7_26 and GRH8_26, are not yet checked against each other's share of it.
