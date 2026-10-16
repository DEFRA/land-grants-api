UPDATE actions
SET
    sidedness = tmp.sidedness,
    last_updated = now(),
    ingest_id = $1
FROM actions_sidedness_tmp tmp
WHERE
    actions.code = tmp.action_code;
