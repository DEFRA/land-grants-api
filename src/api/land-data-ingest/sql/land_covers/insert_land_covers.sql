INSERT INTO land_covers (id, parcel_id, sheet_id, land_cover_class_code, is_linear_feature, geom, last_updated)
SELECT id, parcel_id, sheet_id, LAND_COVER_CLASS_CODE,  CASE
        WHEN LINEAR_FEATURE = 'N' THEN FALSE
        ELSE TRUE
    END as linear_feature_bool, geom, LAST_REFRESH_DATE
FROM land_covers_tmp
ON CONFLICT (id) 
DO UPDATE SET
  land_cover_class_code = EXCLUDED.land_cover_class_code,
  is_linear_feature = EXCLUDED.is_linear_feature,
  geom = EXCLUDED.geom,
  last_updated = NOW();