 CREATE TABLE IF NOT EXISTS land_parcels (
        id SERIAL PRIMARY KEY,
        parcel_id TEXT,
        sheet_id TEXT,
        area_sqm NUMERIC,
        shape GEOMETRY,
        valid_from DATE,
        valid_to DATE,
        last_updated DATE
      );

INSERT INTO land_parcels (parcel_id, sheet_id, area_sqm, shape, valid_from, valid_to, last_updated)
        VALUES 
        ('A1B2C3-4821', 'S001', 120.5, ST_GeomFromText('POLYGON((0 0,0 1,1 1,1 0,0 0))', 4326), CURRENT_DATE, NULL, CURRENT_DATE),
        ('B1C2C3-4821', 'S002', 250.0, ST_GeomFromText('POLYGON((1 1,1 2,2 2,2 1,1 1))', 4326), CURRENT_DATE, NULL, CURRENT_DATE)
