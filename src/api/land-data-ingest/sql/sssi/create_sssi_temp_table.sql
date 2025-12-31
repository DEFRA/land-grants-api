CREATE TEMPORARY TABLE sssi_tmp (
    sbi NUMERIC,
    ngc TEXT,
    id NUMERIC,
    sheet_id TEXT,
    parcel_id TEXT,
    valid_from DATE,
    valid_to DATE,
    area_sqm NUMERIC,
    geom TEXT,
    verified_on DATE,
    verification_type TEXT,
    created_on DATE,
    created_by TEXT,
    validated CHAR(1),
    centroid_x NUMERIC(20, 12),
    centroid_y NUMERIC(20, 12),
    last_refresh_date DATE
);
