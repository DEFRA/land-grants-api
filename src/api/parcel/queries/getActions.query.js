/**
 * Get actions
 * @returns {Array} List of actions
 */
function getActions() {
  return [
    {
      code: 'CSAM1',
      description:
        'CSAM1: Assess soil, produce a soil management plan and test soil organic matter',
      availableArea: {
        unit: 'ha',
        value: 0
      }
    }
  ]
}

export { getActions }
