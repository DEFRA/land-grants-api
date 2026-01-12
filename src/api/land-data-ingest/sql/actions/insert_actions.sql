INSERT INTO actions (code, description, enabled, display, ingest_id, import_date)
SELECT code, description, enabled, display, $1, NOW()
FROM actions_tmp
ON CONFLICT (code) DO UPDATE SET
  code = EXCLUDED.code,
  description = EXCLUDED.description,
  enabled = EXCLUDED.enabled,
  display = EXCLUDED.display,
  ingest_id = $1,
  import_date = NOW();
