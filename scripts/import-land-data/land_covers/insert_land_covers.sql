INSERT INTO land_covers (parcel_id, sheet_id, land_cover_class_code, is_linear_feature, geom, last_updated)
SELECT parcel_id, sheet_id, LAND_COVER_CLASS_CODE,  CASE
        WHEN LINEAR_FEATURE = 'N' THEN FALSE
        ELSE TRUE
    END as linear_feature_bool, geom, LAST_REFRESH_DATE
FROM land_covers_tmp;