TRUNCATE TABLE moorland_designations;

INSERT INTO moorland_designations (lfa_moor_id, name, ref_code, geom, last_updated)
SELECT LFAMOORID, name, ref_code, geom, CURRENT_TIMESTAMP
FROM moorland_designations_tmp;