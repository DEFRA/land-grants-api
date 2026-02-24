INSERT INTO data_layer (source_id, geom, "name", metadata, data_layer_type_id, last_updated, ingest_id)
SELECT 
    globalid, 
    geom, 
    sssi_name, 
    json_build_object(
        'ensis_id', ensis_id,
        'condition', condition
    ), 
    1, 
    TO_DATE(modified,'YYYY/MM/DD'), 
    $1
FROM sssi_tmp
ON CONFLICT (source_id, data_layer_type_id) 
DO UPDATE SET
  geom = EXCLUDED.geom,
  "name" = EXCLUDED."name",
  metadata = EXCLUDED.metadata,
  last_updated = EXCLUDED.last_updated,
  ingest_id = $1;