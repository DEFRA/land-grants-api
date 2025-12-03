INSERT INTO land_parcels (id, parcel_id, sheet_id, area_sqm, geom, last_updated)
SELECT ID, PARCEL_ID, SHEET_ID, GEOM_AREA_SQM, geom, LAST_REFRESH_DATE
FROM land_parcels_tmp
ON CONFLICT (id) 
DO UPDATE SET
  area_sqm = EXCLUDED.area_sqm,
  geom = EXCLUDED.geom,
  last_updated = NOW(),
  ingest_id = $1;