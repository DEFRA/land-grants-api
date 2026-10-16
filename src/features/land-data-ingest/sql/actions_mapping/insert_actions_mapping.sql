-- Upsert so a code in the mapping creates its actions row even before (or
-- without) an action config. enabled/display stay NULL until a config sets them.
INSERT INTO actions (code, sssi_eligible, hf_eligible, ingest_id, last_updated)
SELECT
    tmp.action_code,
    tmp.sssi_eligible,
    tmp.hf_eligible,
    $1,
    now()
FROM action_sssi_hf_mapping_tmp tmp
ON CONFLICT (code) DO UPDATE
SET
    sssi_eligible = EXCLUDED.sssi_eligible,
    hf_eligible = EXCLUDED.hf_eligible,
    ingest_id = EXCLUDED.ingest_id,
    last_updated = EXCLUDED.last_updated;
