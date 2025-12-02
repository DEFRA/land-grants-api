DROP TABLE IF EXISTS land_parcels_tmp CASCADE;

CREATE TEMPORARY TABLE land_parcels_tmp (
    geom TEXT,
    id INTEGER,
    sheet_id VARCHAR(10),
    parcel_id VARCHAR(5),
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_to TIMESTAMP WITH TIME ZONE,
    geom_area_sqm DECIMAL(20,4),
    verified_on TIMESTAMP WITH TIME ZONE,
    verification_type INTEGER,
    created_on TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(50),
    validated CHAR(1),
    centroid_x NUMERIC(20, 12),
    centroid_y NUMERIC(20, 12),
    last_refresh_date TIMESTAMP WITH TIME ZONE
);