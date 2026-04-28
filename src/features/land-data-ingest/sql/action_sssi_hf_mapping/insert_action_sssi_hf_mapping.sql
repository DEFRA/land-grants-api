INSERT INTO action_sssi_hf_mapping (action_code, has_sssi, has_hf, last_updated, ingest_id)
SELECT action_code, has_sssi, has_hf, now(), $1
FROM action_sssi_hf_mapping_tmp;
