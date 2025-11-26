INSERT INTO agreements (id, parcel_id, sheet_id, actions)
SELECT id, parcel_id, sheet_id, actions -- what id?
FROM agreements_tmp
ON CONFLICT (id) 
DO UPDATE SET
  parcel_id = EXCLUDED.parcel_id,
  sheet_id = EXCLUDED.sheet_id,
  actions = EXCLUDED.actions;