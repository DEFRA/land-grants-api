export const landCoverClassCodes = [
  '130',
  '240',
  '250',
  '270',
  '280',
  '300',
  '330',
  '580',
  '590',
  '620',
  '640',
  '650'
]

export const rules = [
  {
    name: 'parcel-has-intersection-with-data-layer',
    description: 'Is this parcel on the moorland?',
    version: '1.0.0',
    config: {
      layerName: 'moorland',
      minimumIntersectionPercent: 50,
      tolerancePercent: 1
    }
  },
  {
    name: 'applied-for-total-available-area',
    description: 'Has the total available area been applied for?',
    version: '1.0.0'
  },
  {
    name: 'hefer-consent-required',
    description:
      'Does the site require a Historic Environment Farm Environment Record?',
    version: '1.0.0',
    config: {
      layerName: 'historic_features',
      tolerancePercent: 0,
      caveatDescription: 'A hefer is needed from Historic England'
    }
  },
  {
    name: 'sssi-consent-required',
    description: 'Is the site of special scientific interest?',
    version: '1.0.0',
    config: {
      layerName: 'sssi',
      tolerancePercent: 1,
      caveatDescription: 'A consent is required from Natural England'
    }
  }
]

export const actions = [
  {
    enabled: true,
    code: 'CMOR1',
    payment: {
      ratePerUnitGbp: 10.6,
      ratePerAgreementPerYearGbp: 272
    },
    applicationUnitOfMeasurement: 'ha',
    durationYears: 3,
    landCoverClassCodes,
    startDate: '2025-01-01',
    version: 1,
    display: true,
    description: 'Assess moorland and produce a written record',
    semanticVersion: '2.0.0',
    rules: rules.slice(0, 2)
  },
  {
    enabled: true,
    code: 'UPL1',
    payment: {
      ratePerUnitGbp: 20
    },
    applicationUnitOfMeasurement: 'ha',
    durationYears: 3,
    landCoverClassCodes,
    startDate: '2025-01-01',
    version: 1,
    display: true,
    description: 'Moderate livestock grazing on moorland',
    semanticVersion: '2.0.0',
    rules
  },
  {
    enabled: true,
    code: 'UPL2',
    payment: {
      ratePerUnitGbp: 53
    },
    applicationUnitOfMeasurement: 'ha',
    durationYears: 3,
    landCoverClassCodes,
    startDate: '2025-01-01',
    version: 1,
    display: true,
    description: 'Low livestock grazing on moorland',
    semanticVersion: '2.0.0',
    rules
  },
  {
    enabled: true,
    code: 'UPL3',
    payment: {
      ratePerUnitGbp: 66
    },
    applicationUnitOfMeasurement: 'ha',
    durationYears: 3,
    landCoverClassCodes,
    startDate: '2025-01-01',
    version: 1,
    display: true,
    description: 'Limited livestock grazing on moorland',
    semanticVersion: '2.0.0',
    rules
  },
  {
    enabled: true,
    code: 'CSAM1',
    payment: {
      ratePerUnitGbp: 6,
      ratePerAgreementPerYearGbp: 97
    },
    applicationUnitOfMeasurement: 'ha',
    durationYears: 3,
    landCoverClassCodes,
    startDate: '2025-01-01',
    version: 1,
    display: false,
    description: 'Conservation support for moorland',
    semanticVersion: '2.0.0'
  }
]
