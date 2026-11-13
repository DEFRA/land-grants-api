// Why an existing action was or was not deducted from the boundary

// Laid end to end with the other deducted actions, so its boundary is deducted
export const DEDUCTED = 'deducted'

// Cannot share with the action applied for, but shares a stretch already deducted
export const STACKED = 'stacked'

// Can share with the action applied for, so takes nothing from it
export const COMPATIBLE = 'compatible'
