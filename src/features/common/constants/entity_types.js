export const ENTITY_TYPES = [
  { name: 'land_parcels', truncateTable: false, ingest: true },
  { name: 'moorland_designations', truncateTable: false },
  { name: 'land_covers', truncateTable: false, ingest: true },
  { name: 'compatibility_matrix', truncateTable: true },
  { name: 'agreements', truncateTable: true },
  { name: 'sssi', truncateTable: false },
  { name: 'registered_battlefields', truncateTable: false },
  { name: 'shine', truncateTable: false },
  { name: 'scheduled_monuments', truncateTable: false },
  { name: 'registered_parks_gardens', truncateTable: false },
  { name: 'action_sssi_hf_mapping', truncateTable: false }
]

/**
 * Get entity by name
 * @param {string} name - The entity name
 * @returns {{name: string, truncateTable: boolean, ingest?: boolean} | undefined} The entity
 */
export const getEntityByName = (name) => {
  return ENTITY_TYPES.find((entity) => entity.name === name)
}
