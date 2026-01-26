-- SQL query to find SSSI data for multiple parcels

WITH parcel_list AS (
  SELECT sheet_id, parcel_id
  FROM (VALUES
    ('TQ4530', '0522'),
    ('TQ4432', '6044'),
    ('TQ5039', '6856'),
    ('TQ4441', '6801'),
    ('SD2396', '0165'),
    ('NY1725', '8271'),
    ('SU7226', '8761'),
    ('SX1976', '3746'),
    ('SP3875', '0438')
  ) AS t(sheet_id, parcel_id)
)
SELECT
    pl.sheet_id,
    pl.parcel_id,
    dl.*
FROM
    parcel_list pl
    INNER JOIN land_parcels lp
        ON lp.sheet_id = pl.sheet_id
        AND lp.parcel_id = pl.parcel_id
    INNER JOIN data_layer dl
        ON dl.data_layer_type_id = 1  -- SSSI data layer type
        AND ST_Intersects(dl.geom, lp.geom)
ORDER BY
    pl.sheet_id,
    pl.parcel_id,
    dl.id;
