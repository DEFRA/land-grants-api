-- Clear both tables
TRUNCATE TABLE public.actions_config;
TRUNCATE TABLE public.actions CASCADE;

-- Populate actions table (core data only)
INSERT INTO actions (code, description, enabled, display)
VALUES
('CMOR1', 'Assess moorland and produce a written record', TRUE, TRUE),
('UPL1', 'Moderate livestock grazing on moorland', TRUE, TRUE),
('UPL2', 'Low livestock grazing on moorland', TRUE, TRUE),
('UPL3', 'Limited livestock grazing on moorland', TRUE, TRUE),
('UPL4', 'Keep cattle and ponies on moorland supplement (minimum 30% GLU)', FALSE, FALSE),
('UPL5', 'Keep cattle and ponies on moorland supplement (minimum 70% GLU)', FALSE, FALSE),
('UPL6', 'Keep cattle and ponies on moorland supplement (100% GLU)', FALSE, FALSE),
('UPL7', 'Shepherding livestock on moorland (no required stock removal period)', FALSE, FALSE),
('UPL8', 'Shepherding livestock on moorland (remove stock for at least 4 months)', FALSE, FALSE),
('UPL9', 'Shepherding livestock on moorland (remove stock for at least 6 months)', FALSE, FALSE),
('SPM4', 'Keep native breeds on extensively managed habitats supplement (50-80%)', TRUE, FALSE),
('SPM5', 'Keep native breeds on extensively managed habitats supplement (more than 80%)', FALSE, FALSE),
('SAM1', 'Assess soil, produce a soil management plan and test soil organic matter', TRUE, FALSE),
('OFM3', 'Organic land management – enclosed rough grazing', TRUE, FALSE),
('CSAM1', 'Assess soil, produce a soil management plan and test soil organic matter', TRUE, FALSE);

-- Populate actions_config table (configuration data)
INSERT INTO actions_config (code, version, major_version, minor_version, patch_version, config, is_active, last_updated_at)
VALUES
(
    'CMOR1',
    1,
    1,
    0,
    0,
    '{
        "start_date": "2025-01-01",
        "duration_years": 3,
        "application_unit_of_measurement": "ha",
        "payment": {
            "ratePerUnitGbp": 10.6,
            "ratePerAgreementPerYearGbp": 272
        },
        "land_cover_class_codes": [
            "130", "240", "250", "270", "280", "300", "330", "580", "590", "620", "640", "650"
        ],
        "rules": [
            {
                "name": "parcel-has-intersection-with-data-layer",
                "description": "Is this parcel on the moorland?",
                "config": {
                    "layerName": "moorland",
                    "minimumIntersectionPercent": 50,
                    "tolerancePercent": 1
                }
            },
            {
                "name": "applied-for-total-available-area",
                "description": "Has the total available area been applied for?"
            }
        ]
    }',
    TRUE,
    now()
),
(
    'UPL1',
    1,
    1,
    0,
    0,
    '{
        "start_date": "2025-01-01",
        "duration_years": 3,
        "application_unit_of_measurement": "ha",
        "payment": {
            "ratePerUnitGbp": 20
        },
        "land_cover_class_codes": [
            "130", "240", "250", "270", "280", "300", "330", "580", "590", "620", "640", "650"
        ],
        "rules": [
            {
                "name": "parcel-has-intersection-with-data-layer",
                "description": "Is this parcel on the moorland?",
                "config": {
                    "layerName": "moorland",
                    "minimumIntersectionPercent": 50,
                    "tolerancePercent": 1
                }
            },
            {
                "name": "applied-for-total-available-area",
                "description": "Has the total available area been applied for?"
            }
        ]
    }',
    TRUE,
    now()
),
(
    'UPL2',
    1,
    1,
    0,
    0,
    '{
        "start_date": "2025-01-01",
        "duration_years": 3,
        "application_unit_of_measurement": "ha",
        "payment": {
            "ratePerUnitGbp": 53
        },
        "land_cover_class_codes": [
            "130", "240", "250", "270", "280", "300", "330", "580", "590", "620", "640", "650"
        ],
        "rules": [
            {
                "name": "parcel-has-intersection-with-data-layer",
                "description": "Is this parcel on the moorland?",
                "config": {
                    "layerName": "moorland",
                    "minimumIntersectionPercent": 50,
                    "tolerancePercent": 1
                }
            },
            {
                "name": "applied-for-total-available-area",
                "description": "Has the total available area been applied for?"
            }
        ]
    }',
    TRUE,
    now()
),
(
    'UPL3',
    1,
    1,
    0,
    0,
    '{
        "start_date": "2025-01-01",
        "duration_years": 3,
        "application_unit_of_measurement": "ha",
        "payment": {
            "ratePerUnitGbp": 66
        },
        "land_cover_class_codes": [
            "130", "240", "250", "270", "280", "300", "330", "580", "590", "620", "640", "650"
        ],
        "rules": [
            {
                "name": "parcel-has-intersection-with-data-layer",
                "description": "Is this parcel on the moorland?",
                "config": {
                    "layerName": "moorland",
                    "minimumIntersectionPercent": 50,
                    "tolerancePercent": 1
                }
            },
            {
                "name": "applied-for-total-available-area",
                "description": "Has the total available area been applied for?"
            }
        ]
    }',
    TRUE,
    now()
),
(
    'UPL4',
    1,
    1,
    0,
    0,
    '{
        "start_date": "2025-01-01",
        "duration_years": 3,
        "application_unit_of_measurement": "ha",
        "payment": {
            "ratePerUnitGbp": 7,
            "ratePerAgreementPerYearGbp": 0
        },
        "land_cover_class_codes": [],
        "rules": []
    }',
    TRUE,
    now()
),
(
    'UPL5',
    1,
    1,
    0,
    0,
    '{
        "start_date": "2025-01-01",
        "duration_years": 3,
        "application_unit_of_measurement": "ha",
        "payment": {
            "ratePerUnitGbp": 18,
            "ratePerAgreementPerYearGbp": 0
        },
        "land_cover_class_codes": [],
        "rules": []
    }',
    TRUE,
    now()
),
(
    'UPL6',
    1,
    1,
    0,
    0,
    '{
        "start_date": "2025-01-01",
        "duration_years": 3,
        "application_unit_of_measurement": "ha",
        "payment": {
            "ratePerUnitGbp": 23,
            "ratePerAgreementPerYearGbp": 0
        },
        "land_cover_class_codes": [],
        "rules": []
    }',
    TRUE,
    now()
),
(
    'UPL7',
    1,
    1,
    0,
    0,
    '{
        "start_date": "2025-01-01",
        "duration_years": 3,
        "application_unit_of_measurement": "ha",
        "payment": {
            "ratePerUnitGbp": 33,
            "ratePerAgreementPerYearGbp": 0
        },
        "land_cover_class_codes": [],
        "rules": []
    }',
    TRUE,
    now()
),
(
    'UPL8',
    1,
    1,
    0,
    0,
    '{
        "start_date": "2025-01-01",
        "duration_years": 3,
        "application_unit_of_measurement": "ha",
        "payment": {
            "ratePerUnitGbp": 43,
            "ratePerAgreementPerYearGbp": 0
        },
        "land_cover_class_codes": [],
        "rules": []
    }',
    TRUE,
    now()
),
(
    'UPL9',
    1,
    1,
    0,
    0,
    '{
        "start_date": "2025-01-01",
        "duration_years": 3,
        "application_unit_of_measurement": "ha",
        "payment": {
            "ratePerUnitGbp": 45,
            "ratePerAgreementPerYearGbp": 0
        },
        "land_cover_class_codes": [],
        "rules": []
    }',
    TRUE,
    now()
),
(
    'SPM4',
    1,
    1,
    0,
    0,
    '{
        "start_date": "2025-01-01",
        "duration_years": 3,
        "application_unit_of_measurement": "ha",
        "payment": {
            "ratePerUnitGbp": 7,
            "ratePerAgreementPerYearGbp": 0
        },
        "land_cover_class_codes": [],
        "rules": []
    }',
    TRUE,
    now()
),
(
    'SPM5',
    1,
    1,
    0,
    0,
    '{
        "start_date": "2025-01-01",
        "duration_years": 3,
        "application_unit_of_measurement": "ha",
        "payment": {
            "ratePerUnitGbp": 11,
            "ratePerAgreementPerYearGbp": 0
        },
        "land_cover_class_codes": [],
        "rules": []
    }',
    TRUE,
    now()
),
(
    'SAM1',
    1,
    1,
    0,
    0,
    '{
        "start_date": "2025-01-01",
        "duration_years": 3,
        "application_unit_of_measurement": "ha",
        "payment": {
            "ratePerUnitGbp": 6,
            "ratePerAgreementPerYearGbp": 97
        },
        "land_cover_class_codes": [],
        "rules": []
    }',
    TRUE,
    now()
),
(
    'OFM3',
    1,
    1,
    0,
    0,
    '{
        "start_date": "2025-01-01",
        "duration_years": 3,
        "application_unit_of_measurement": "ha",
        "payment": {
            "ratePerUnitGbp": 97,
            "ratePerAgreementPerYearGbp": 0
        },
        "land_cover_class_codes": [
            "130", "240", "250", "270", "280", "300", "330", "580", "590", "620", "640", "650"
        ],
        "rules": []
    }',
    TRUE,
    now()
),
(
    'CSAM1',
    1,
    1,
    0,
    0,
    '{
        "start_date": "2025-01-01",
        "duration_years": 3,
        "application_unit_of_measurement": "ha",
        "payment": {
            "ratePerUnitGbp": 6,
            "ratePerAgreementPerYearGbp": 97
        },
        "land_cover_class_codes": [
            "110", "111", "112", "117", "118", "121", "130", "131", "140", "141", "142", "143"
        ],
        "rules": []
    }',
    TRUE,
    now()
);
