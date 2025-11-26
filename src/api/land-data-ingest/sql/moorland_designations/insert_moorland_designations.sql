INSERT INTO moorland_designations (id, lfa_moor_id, name, ref_code, geom, last_updated)
SELECT OBJECTID, LFAMOORID, name, ref_code, geom, CURRENT_TIMESTAMP
FROM moorland_designations_tmp
ON CONFLICT (id) 
DO UPDATE SET
  lfa_moor_id = EXCLUDED.lfa_moor_id,
  name = EXCLUDED.name,
  ref_code = EXCLUDED.ref_code,
  geom = EXCLUDED.geom,
  last_updated = NOW();