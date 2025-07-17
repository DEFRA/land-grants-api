INSERT INTO actions (version, enabled, display, start_date, code, description, application_unit_of_measurement, payment, land_cover_class_codes, rules) 
VALUES
(
    1, 
    TRUE, 
    TRUE, 
    '2025-01-01', 
    'CMOR1', 
    'CMOR1: Assess moorland and produce a written record', 
    'ha',
    '{
        "ratePerUnitGbp": 10.6,
        "ratePerAgreementPerYearGbp": 272
    }',
    '[
        "130",
        "240",
        "250",
        "270",
        "280",
        "300",
        "330",
        "580",
        "590",
        "620",
        "640",
        "650"
    ]',
    '[
        {
            "name": "parcel-has-intersection-with-data-layer",
            "config": {
            "layerName": "moorland",
            "minimumIntersectionPercent": 50,
            "tolerancePercent": 1
            }
        },
        {
            "name": "applied-for-total-available-area"
        }
    ]'
),(
    1, 
    TRUE, 
    TRUE, 
    '2025-01-01', 
    'UPL1',
    'UPL1: Moderate livestock grazing on moorland',
    'ha',
    '{
       "ratePerUnitGbp": 20
    }',
    '[
    "130",
    "240",
    "250",
    "270",
    "280",
    "300",
    "330",
    "580",
    "590",
    "620",
    "640",
    "650"
    ]',
    '[
        {
            "name": "parcel-has-intersection-with-data-layer",
            "config": {
            "layerName": "moorland",
            "minimumIntersectionPercent": 50,
            "tolerancePercent": 1
            }
        },
        {
            "name": "applied-for-total-available-area"
        }
    ]'
),
(
    1,
    TRUE,
    TRUE,
    '2025-01-01',
    'UPL2',
    'UPL2: Low livestock grazing on moorland',
    'ha',
    '{
    "ratePerUnitGbp": 53
    }',
    '[
    "130",
    "240",
    "250",
    "270",
    "280",
    "300",
    "330",
    "580",
    "590",
    "620",
    "640",
    "650"
    ]',
    '[
    {
        "name": "parcel-has-intersection-with-data-layer",
        "config": {
        "layerName": "moorland",
        "minimumIntersectionPercent": 50,
        "tolerancePercent": 1
        }
    },
    {
        "name": "applied-for-total-available-area"
    }
    ]'
),
(
   1,
    TRUE,
    TRUE,
    '2025-01-01',
    'UPL3', 
    'UPL3: Limited livestock grazing on moorland',
    'ha',
    '{
    "ratePerUnitGbp": 66
    }',
    '[
    "130",
    "240",
    "250",
    "270",
    "280",
    "300",
    "330",
    "580",
    "590",
    "620",
    "640",
    "650"
    ]',
    '[
    {
        "name": "parcel-has-intersection-with-data-layer",
        "config": {
        "layerName": "moorland",
        "minimumIntersectionPercent": 50,
        "tolerancePercent": 1
        }
    },
    {
        "name": "applied-for-total-available-area"
    }
    ]'
),
(
    1,
    FALSE,
    FALSE,
    '2025-01-01',
    'UPL4',
    'UPL4: Keep cattle and ponies on moorland supplement (minimum 30% GLU)',
    'ha'
    '{
    "ratePerUnitGbp": 0,
    "ratePerAgreementPerYearGbp": 0
    }',
    '[]',
    '[]'
),
(
    1,
    FALSE,
    FALSE,
    '2025-01-01',
    'UPL5',
    'UPL5: Keep cattle and ponies on moorland supplement (minimum 70% GLU)',
    'ha'
    '{
    "ratePerUnitGbp": 0,
    "ratePerAgreementPerYearGbp": 0
    }',
    '[]',
    '[]'
),
(
    1,
    FALSE,
    FALSE,
    '2025-01-01',
    'UPL6',
    'UPL6: Keep cattle and ponies on moorland supplement (100% GLU)',
    'ha'
    '{
    "ratePerUnitGbp": 0,
    "ratePerAgreementPerYearGbp": 0
    }',
    '[]',
    '[]'
),
(
    1,
    FALSE,
    FALSE,
    '2025-01-01',
    'UPL7',
    'UPL7: Shepherding livestock on moorland (no required stock removal period)',
    'ha'
    '{
    "ratePerUnitGbp": 0,
    "ratePerAgreementPerYearGbp": 0
    }',
    '[]',
    '[]'
),
(
    1,
    FALSE,
    FALSE,
    '2025-01-01',
    'UPL8',
    'UPL8: Shepherding livestock on moorland (remove stock for at least 4 months)',
    'ha'
    '{
    "ratePerUnitGbp": 0,
    "ratePerAgreementPerYearGbp": 0
    }',
    '[]',
    '[]'
),
(
    1,
    FALSE,
    FALSE,
    '2025-01-01',
    'UPL9',
    'UPL9: Shepherding livestock on moorland (remove stock for at least 6 months)',
    'ha'
    '{
    "ratePerUnitGbp": 0,
    "ratePerAgreementPerYearGbp": 0
    }',
    '[]',
    '[]'
),
(
    1,
    TRUE,
    FALSE,
    '2025-01-01',
    'SPM4',
    'SPM4: Keep native breeds on extensively managed habitats supplement (50-80%)',
    'ha'
    '{
    "ratePerUnitGbp": 0,
    "ratePerAgreementPerYearGbp": 0
    }',
    '[]',
    '[]'
),
(
    1,
    FALSE,
    FALSE,
    '2025-01-01',
    'SPM5',
    'SPM5: Keep native breeds on extensively managed habitats supplement (more than 80%)',
    'ha'
    '{
    "ratePerUnitGbp": 0,
    "ratePerAgreementPerYearGbp": 0
    }',
    '[]',
    '[]'
),
(
    1,
    TRUE,
    FALSE,
    '2025-01-01',
    'SAM1',
    'SAM1: Assess soil, produce a soil management plan and test soil organic matter',
    'ha'
    '{
    "ratePerUnitGbp": 0,
    "ratePerAgreementPerYearGbp": 0
    }',
    '[]',
    '[]'
),
(
    1,
    TRUE,
    FALSE,
    '2025-01-01',
    'OFM3',
    'OFM3: Organic land management – enclosed rough grazing',
    'ha'
    '{
    "ratePerUnitGbp": 0,
    "ratePerAgreementPerYearGbp": 0
    }',
    '[
    "130",
    "240",
    "250",
    "270",
    "280",
    "300",
    "330",
    "580",
    "590",
    "620",
    "640",
    "650"
    ]',
    '[]'
),
(
    1,
    FALSE,
    TRUE,
    '2025-01-01',
    'CSAM1',
    'CSAM1: Assess soil, produce a soil management plan and test soil organic matter',
    'ha'
    '{
    "ratePerUnitGbp": 0,
    "ratePerAgreementPerYearGbp": 0
    }',
    '[
    "110",
    "111",
    "112",
    "117",
    "118",
    "121",
    "130",
    "131",
    "140",
    "141",
    "142",
    "143"
    ]',
    '[]'
);