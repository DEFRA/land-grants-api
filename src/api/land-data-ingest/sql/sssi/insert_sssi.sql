INSERT INTO sssi (sbi, sheet_id, parcel_id, valid_from, valid_to, area_sqm, verified_on, verification_type, last_updated, ingest_id)
SELECT sbi, sheet_id, parcel_id, valid_from, valid_to, area_sqm, verified_on, verification_type, last_refresh_date, $1
FROM sssi_tmp;
