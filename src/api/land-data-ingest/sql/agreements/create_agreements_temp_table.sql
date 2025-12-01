DROP TABLE IF EXISTS agreements_tmp CASCADE;

CREATE TEMPORARY TABLE agreements_tmp (
    sbi NUMERIC,
    scheme TEXT,
    ord_survey TEXT,
    ng_number integer,
    agreement_ref TEXT,
    option_code TEXT,
    option_start_date TEXT,
    option_end_date TEXT,
    option_quantity NUMERIC,
    unit_of_measure TEXT
);