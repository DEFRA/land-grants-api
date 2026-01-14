CREATE TEMPORARY TABLE actions_config_tmp (
  code TEXT,
  version TEXT,
  start_date DATE,
  duration_years NUMERIC,
  application_unit_of_measurement TEXT,
  ratePerUnitGbp NUMERIC,
  ratePerAgreementPerYearGbp NUMERIC,
  land_cover_class_codes TEXT,
  rules TEXT,
  is_active BOOLEAN,
  last_updated_at TIMESTAMP
);
