 CREATE SCHEMA IF NOT EXISTS land;

 CREATE TABLE IF NOT EXISTS land.land_covers (
        id SERIAL PRIMARY KEY,
        parcel_id TEXT,
        sheet_id TEXT,
        land_cover_class_code TEXT, 
        is_linear_feature BOOLEAN,
        area_sqm NUMERIC,
        geom GEOMETRY
      );

CREATE TABLE IF NOT EXISTS land.land_parcels (
        id SERIAL PRIMARY KEY,
        parcel_id TEXT,
        sheet_id TEXT,
        area_sqm NUMERIC,
        geom GEOMETRY,
        valid_from TIMESTAMP NOT NULL DEFAULT NOW(),
        valid_to   TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '3 months',
        last_updated DATE
      );

CREATE TABLE IF NOT EXISTS land.moorland_designations (
    id SERIAL PRIMARY KEY,
    lfa_moor_id NUMERIC, 
    name TEXT, 
    ref_code TEXT, 
    geom GEOMETRY);      