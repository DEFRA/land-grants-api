INSERT INTO actions_config (code, version, config, is_active, last_updated_at, ingest_id, ingest_date)
SELECT
  code,
  version,
  jsonb_build_object(
    'start_date', start_date,
    'duration_years', duration_years,
    'application_unit_of_measurement', application_unit_of_measurement,
    'payment', jsonb_build_object(
      'ratePerUnitGbp', ratePerUnitGbp,
      'ratePerAgreementPerYearGbp', ratePerAgreementPerYearGbp
    ),
    'land_cover_class_codes', CASE
      WHEN land_cover_class_codes IS NULL OR land_cover_class_codes = '' OR land_cover_class_codes = '[]' THEN '[]'::jsonb
      ELSE land_cover_class_codes::jsonb
    END,
    'rules', CASE
      WHEN rules IS NULL OR rules = '' OR rules = '[]' THEN '[]'::jsonb
      ELSE rules::jsonb
    END
  ) as config,
  is_active,
  last_updated_at,
  $1,
  NOW()
FROM actions_config_tmp
ON CONFLICT (code, version) DO UPDATE SET
  config = EXCLUDED.config,
  is_active = EXCLUDED.is_active,
  last_updated_at = EXCLUDED.last_updated_at,
  ingest_id = $1,
  ingest_date = NOW();
