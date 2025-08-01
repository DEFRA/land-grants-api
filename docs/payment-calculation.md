## Payment calculations

- [Back home](../readme.md)

Each action has a different way of calculating the total owed annually if the application gets approved and accepted. Most are a simple multiplication of the quantity of measurement applied for by the value. For example, for **SCR1**, the calculation is `£588 per hectare (ha) per year`.

### Payment Calculation Diagram

```mermaid
flowchart TD
  start[/Actions, quantities,
  agreement length/]

  generateSchedule[Generate schedule]
  createItems[Create parcel and
  agreement level items]
  calculateTotals[Calculate annual
  and agreement totals]
  calculateScheduled[Calculate
    scheduled payments]
  shiftPennies[Shift payment pennies
  to first scheduled payment]
  roundAmounts[Round decimals
  from final items amounts]

  result[/Final Payment Calculation/]

  start --> generateSchedule
  start --> createItems
  createItems --> calculateTotals
  createItems --> calculateScheduled
  generateSchedule --> calculateScheduled
  calculateTotals
  calculateScheduled --> shiftPennies
  shiftPennies --> roundAmounts
  calculateTotals --> result
  roundAmounts --> result
```
