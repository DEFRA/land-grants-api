INSERT INTO data_layer (source_id, geom, "name", metadata, data_layer_type_id, last_updated, ingest_id)
SELECT 
  OBJECTID, 
  geom,
  "name",
  json_build_object(
        'ref_code', ref_code,
        'lfamoorid', LFAMOORID
    ),  
  2, 
  CURRENT_TIMESTAMP, 
  $1
FROM moorland_designations_tmp
ON CONFLICT (source_id, data_layer_type_id) 
DO UPDATE SET
  geom = EXCLUDED.geom,
  "name" = EXCLUDED."name",
  metadata = EXCLUDED.metadata,
  last_updated = EXCLUDED.last_updated,
  ingest_date = NOW(),
  ingest_id = $1;
