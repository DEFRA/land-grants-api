CREATE TABLE IF NOT EXISTS land.moorland_designations (
    id SERIAL PRIMARY KEY,
    lfa_moor_id NUMERIC, 
    name TEXT, 
    ref_code TEXT, 
    geom GEOMETRY,
    last_updated DATE);  