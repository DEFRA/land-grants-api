INSERT INTO compatibility_matrix (option_code, option_code_compat, year, type, updated_by, ingest_date)
SELECT DISTINCT ON (OPTIONCODE, OPTIONCODECOMPAT, YEAR, TYPE)
  OPTIONCODE,
  OPTIONCODECOMPAT,
  YEAR,
  TYPE,
  $1::text,
  now()
FROM compatibility_matrix_tmp
