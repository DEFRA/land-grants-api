INSERT INTO data_layer (source_id, geom, "name", metadata, data_layer_type_id, last_updated, ingest_id)
SELECT
    list_entry::TEXT,
    shape,
    "name",
    json_build_object(
        'grade', grade,
        'area_ha', area_ha,
        'ngr', ngr,
        'hyperlink', hyperlink,
        'reg_date', reg_date,
        'amend_date', amend_date,
        'capture_scale', capture_scale,
        'type', 'registered_parks_gardens'
    ),
    3,
    TO_DATE(SUBSTRING(COALESCE(amend_date, reg_date) FROM 1 FOR 10), 'YYYY/MM/DD'),
    $1
FROM registered_parks_gardens_tmp
ON CONFLICT (source_id, data_layer_type_id, (metadata->>'type'))
DO UPDATE SET
    geom = EXCLUDED.geom,
    "name" = EXCLUDED."name",
    metadata = EXCLUDED.metadata,
    last_updated = EXCLUDED.last_updated,
    ingest_id = $1;
