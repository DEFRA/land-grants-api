INSERT INTO sssi (ensis_id, global_id, geom, sssi_name, last_updated, ingest_id)
SELECT ensis_id, globalid, geom, sssi_name, CURRENT_TIMESTAMP, $1
FROM sssi_tmp;
