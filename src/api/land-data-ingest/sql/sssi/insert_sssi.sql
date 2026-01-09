INSERT INTO sssi (ensis_id, global_id, geom, sssi_name, last_updated, ingest_id)
SELECT ensis_id, globalid, geom, sssi_name, CURRENT_TIMESTAMP, $1
FROM sssi_tmp
ON CONFLICT (ensis_id, global_id) 
DO UPDATE SET
  geom = EXCLUDED.geom,
  sssi_name = EXCLUDED.sssi_name,
  last_updated = NOW(),
  ingest_id = $1;
