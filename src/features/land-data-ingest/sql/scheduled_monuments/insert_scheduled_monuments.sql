INSERT INTO data_layer (source_id, geom, name, metadata, data_layer_type_id, last_updated, ingest_id)
SELECT 
    ListEntry,
    SHAPE, 
    "name", 
    json_build_object(
        'SchedDate', SchedDate,
        'CaptureScale', CaptureScale,
        'hyperlink', hyperlink,
        'area_ha', area_ha,
        'NGR', NGR,
        'Easting', Easting,
        'Northing', Northing,
        'type', 'scheduled_monuments'
    ), 
    3, 
    TO_DATE(AmendDate,'YYYY/MM/DD'), 
    $1
FROM scheduled_monuments_tmp
ON CONFLICT (source_id) 
DO UPDATE SET
  geom = EXCLUDED.geom,
  name = EXCLUDED.name,
  metadata = EXCLUDED.metadata,
  last_updated = EXCLUDED.last_updated,
  ingest_id = $1;