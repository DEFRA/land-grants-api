INSERT INTO data_layer (source_id, geom, "name", metadata, data_layer_type_id, last_updated, ingest_id)
SELECT 
    shine_uid, 
    geom, 
    shine_name, 
    json_build_object(
        'significan', significan,
        'web_url', web_url,
        'shine_form', shine_form,
        'type', 'shine'
    ), 
    3, 
    TO_DATE(last_edit,'YYYY/MM/DD'), 
    $1
FROM shine_tmp
ON CONFLICT (source_id, data_layer_type_id, (metadata->>'type')) 
DO UPDATE SET
  geom = EXCLUDED.geom,
  "name" = EXCLUDED."name",
  metadata = EXCLUDED.metadata,
  last_updated = EXCLUDED.last_updated,
  ingest_id = $1;