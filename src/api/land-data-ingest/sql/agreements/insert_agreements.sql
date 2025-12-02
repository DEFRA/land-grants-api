WITH truncated AS (
  DELETE FROM agreements
)

INSERT INTO agreements (sheet_id, parcel_id, actions, ingest_id)
SELECT
    ord_survey,
    ng_number,
    json_agg(
        json_build_object(
            'actionCode', option_code,
            'quantity', option_quantity,
            'unit', 'ha',
            'startDate', option_start_date,
            'endDate', option_end_date
        )
    ) as actions,
    $1
FROM
    agreements_tmp
WHERE
    unit_of_measure = 'Hectares'
GROUP BY
    ord_survey,
    ng_number;
