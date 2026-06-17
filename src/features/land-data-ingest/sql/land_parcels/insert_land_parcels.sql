INSERT INTO land_parcels_staging (parcel_id, sheet_id, area_sqm, geom, last_updated, ingest_id)
SELECT PARCEL_ID, SHEET_ID, GEOM_AREA_SQM, geom, LAST_REFRESH_DATE, $1
FROM land_parcels_tmp