INSERT INTO land_parcels (parcel_id, sheet_id, area_sqm, geom, last_updated, ingest_id)
SELECT PARCEL_ID, SHEET_ID, GEOM_AREA_SQM, geom, LAST_REFRESH_DATE, $1
FROM land_parcels_tmp
ON CONFLICT (parcel_id, sheet_id) 
DO UPDATE SET
  area_sqm = EXCLUDED.area_sqm,
  geom = EXCLUDED.geom,
  last_updated = EXCLUDED.last_updated,
  ingest_date = NOW(),
  ingest_id = $1;