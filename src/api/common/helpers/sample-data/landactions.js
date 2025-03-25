export default [
  {
    parcelId: 'SFI123456789',
    sbi: '123456789',
    message: 'Uplands data',
    actions: [
      {
        code: 'BND1',
        title: 'BND1: Maintain dry stone walls',
        duration: '3 years',
        funding: '£27 per 100 metres (m) for both sides',
        landTypes: 'Arable and 2 others',
        areasOfInterest: 'Boundaries',
        paymentTypes: 'Revenue',
        availableArea: {
          unit: 'ha',
          value: Math.round(Math.random() * 1000)
        }
      },
      {
        code: 'BND2',
        title: 'BND2: Maintain dry stone walls',
        duration: '2 years',
        funding: '£30 per 200 metres (m) for both sides',
        landTypes: 'Arable and 2 others',
        areasOfInterest: 'Boundaries',
        paymentTypes: 'Revenue',
        availableArea: {
          unit: 'ha',
          value: Math.round(Math.random() * 1000)
        }
      }
    ],
    parcel: {
      parcelId: 'SFI123456789',
      sheetId: 'SH1236723',
      size: {
        unit: 'mtr',
        value: 100
      }
    }
  },
  {
    parcelId: 'BDI123456711',
    sbi: '123456789',
    message: 'Uplands moorlands data',
    actions: [
      {
        code: 'BND2',
        title: 'BND2: Maintain dry stone walls',
        duration: '2 years',
        funding: '£30 per 100 metres (m) for both sides',
        landTypes: 'Arable and 2 others',
        areasOfInterest: 'Boundaries',
        paymentTypes: 'Revenue',
        availableArea: {
          unit: 'ha',
          value: Math.round(Math.random() * 1000)
        }
      },
      {
        code: 'BND1',
        title: 'BND1: Maintain dry stone walls',
        duration: '5 years',
        funding: '£30 per 200 metres (m) for both sides',
        landTypes: 'Arable and 2 others',
        areasOfInterest: 'Boundaries',
        paymentTypes: 'Revenue',
        availableArea: {
          unit: 'ha',
          value: Math.round(Math.random() * 1000)
        }
      }
    ],
    parcel: {
      parcelId: 'BDI123456711',
      sheetId: 'SH1236723',
      size: {
        unit: 'mtr',
        value: 100
      }
    }
  }
]
