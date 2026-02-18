INSERT INTO data_layer (source_id, geom, name, metadata, data_layer_type_id, last_updated, ingest_id)
SELECT
    list_entry::TEXT,
    ST_GeomFromText(shape, 27700),
    name,
    json_build_object(
        'area_ha', area_ha,
        'ngr', ngr,
        'hyperlink', hyperlink,
        'reg_date', reg_date,
        'amend_date', amend_date,
        'capture_scale', capture_scale,
        'type', 'registered_battlefields'
    ),
    3,
    TO_DATE(SUBSTRING(COALESCE(amend_date, reg_date) FROM 1 FOR 10), 'YYYY/MM/DD'),
    $1
FROM registered_battlefields_tmp
ON CONFLICT (source_id)
DO UPDATE SET
    geom = EXCLUDED.geom,
    name = EXCLUDED.name,
    metadata = EXCLUDED.metadata,
    last_updated = EXCLUDED.last_updated,
    ingest_id = $1;
