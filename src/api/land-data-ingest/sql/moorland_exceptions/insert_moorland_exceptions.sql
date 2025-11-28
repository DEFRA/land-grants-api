TRUNCATE TABLE moorland_exceptions;

INSERT INTO moorland_exceptions (parcel_id, sheet_id, ref_code)
SELECT PARTICELLA, FOGLIO, CODICE
FROM moorland_exceptions_tmp;
