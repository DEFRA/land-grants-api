 CREATE TABLE IF NOT EXISTS land.land_covers (
        id SERIAL PRIMARY KEY,
        parcel_id TEXT,
        sheet_id TEXT,
        land_cover_class_code TEXT, 
        is_linear_feature BOOLEAN,
        area_sqm NUMERIC,
        geom GEOMETRY
      );