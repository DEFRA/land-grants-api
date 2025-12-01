WITH truncated AS (
  DELETE FROM compatibility_matrix RETURNING *
)

-- TRUNCATE TABLE compatibility_matrix;
INSERT INTO compatibility_matrix (option_code, option_code_compat, year, ingest_id)
SELECT OPTIONCODE, OPTIONCODECOMPAT, YEAR, $1 FROM compatibility_matrix_tmp
