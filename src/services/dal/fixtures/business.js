export const PARCEL_ID = '0001'
export const SHEET_ID = 'NY0001'

const ACTION_COMMON = {
  parcelName: PARCEL_ID,
  sheetName: SHEET_ID,
  startDate: '2020-01-01T00:00:00+01:00',
  endDate: '2021-01-01T00:00:00+01:00'
}

// Repair stone-faced earth banks, paid per metre
const ACTION_BN1 = {
  actionArea: null,
  actionMTL: 10,
  actionUnits: null,
  optionCode: 'BN1',
  ...ACTION_COMMON
}

const ACTION_BN2 = { ...ACTION_BN1, optionCode: 'BN2' }

// Construct wetlands to treat pollution (capital grant, paid as 50% of actual cost)
const ACTION_RP8 = {
  actionArea: null,
  actionMTL: null,
  actionUnits: null,
  optionCode: 'RP8',
  ...ACTION_COMMON
}

// Manage grassland, paid per hectare
const ACTION_CLIG3 = {
  actionArea: 100,
  actionMTL: null,
  actionUnits: null,
  optionCode: 'CLIG3',
  ...ACTION_COMMON
}

// Plant trees, paid per tree
const ACTION_AF1 = {
  actionArea: null,
  actionMTL: null,
  actionUnits: 1000,
  optionCode: 'AF1',
  ...ACTION_COMMON
}

export const SIMPLE_BUSINESS = {
  agreements: [
    { status: 'SIGNED', paymentSchedules: [ACTION_BN1, ACTION_BN2] },
    { status: 'SIGNED', paymentSchedules: [ACTION_AF1] }
  ]
}

export const BUSINESS_CLIG3 = {
  agreements: [{ status: 'SIGNED', paymentSchedules: [ACTION_CLIG3] }]
}

export const BUSINESS_WITH_DRAFTS = {
  agreements: [
    { status: 'DRAFT', paymentSchedules: [ACTION_BN1] },
    { status: 'DRAFT', paymentSchedules: [ACTION_BN2] },
    { status: 'SIGNED', paymentSchedules: [ACTION_AF1] }
  ]
}

export const BUSINESS_WITH_CAPITAL_GRANTS = {
  agreements: [
    { status: 'SIGNED', paymentSchedules: [ACTION_BN1, ACTION_AF1, ACTION_RP8] }
  ]
}

export const BUSINESS_WITH_MULTIPLE_PARCELS = {
  agreements: [
    {
      status: 'SIGNED',
      paymentSchedules: [
        ACTION_BN1,
        { ...ACTION_BN2, parcelName: '0002' },
        { ...ACTION_AF1, parcelName: 'NY0002' }
      ]
    }
  ]
}
