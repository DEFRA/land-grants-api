UPDATE actions
SET
    sssi_eligible = tmp.sssi_eligible,
    hf_eligible = tmp.hf_eligible,
    last_updated = now(),
    ingest_id = $1
FROM actions_mapping_tmp tmp
WHERE
    actions.code = tmp.action_code;
