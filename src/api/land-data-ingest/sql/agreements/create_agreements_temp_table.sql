DROP TABLE IF EXISTS agreements_tmp CASCADE;

CREATE TEMPORARY TABLE agreements_tmp (
    sbi INTEGER,
    scheme TEXT,
    ord_survey TEXT,
    ng_number integer,
    option_code TEXT,
    option_start_date DATE,
    option_end_date DATE,
    option_quantity NUMERIC,
    unit_of_measure TEXT
);