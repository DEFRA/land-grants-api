CREATE TABLE IF NOT EXISTS land.land_parcels (
        id SERIAL PRIMARY KEY,
        parcel_id TEXT,
        sheet_id TEXT,
        area_sqm NUMERIC,
        geom GEOMETRY,
        last_updated DATE
      );