-- Upsert so a code in the eligibility file creates its actions row even before (or
INSERT INTO actions (code, sssi_eligible, hf_eligible, sidedness, updated_by, last_updated)
SELECT
    tmp.action_code,
    tmp.sssi_eligible,
    tmp.hf_eligible,
    tmp.sidedness,
    $1,
    now()
FROM actions_eligibility_tmp tmp
ON CONFLICT (code) DO UPDATE
SET
    sssi_eligible = EXCLUDED.sssi_eligible,
    hf_eligible = EXCLUDED.hf_eligible,
    sidedness = EXCLUDED.sidedness,
    updated_by = EXCLUDED.updated_by,
    last_updated = EXCLUDED.last_updated;
