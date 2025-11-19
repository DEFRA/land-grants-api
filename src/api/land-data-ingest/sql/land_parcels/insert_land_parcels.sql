INSERT INTO land_parcels (id, parcel_id, sheet_id, area_sqm, geom, last_updated)
SELECT record_id, parcel_id, sheet_id, area_sqm, geometry_wkt, last_updated
FROM land_parcels_tmp
ON CONFLICT (id) 
DO UPDATE SET
  area_sqm = EXCLUDED.area_sqm,
  geom = EXCLUDED.geom,
  last_updated = NOW();