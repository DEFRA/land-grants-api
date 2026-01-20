import { paymentCalculationTransformerV2 } from './payment.transformer.js'

describe('paymentCalculationTransformerV2', () => {
  test('should transform parcelItems with semanticVersion to version', () => {
    const response = {
      parcelItems: {
        1: {
          code: 'UPL1',
          description: 'Moderate livestock grazing on moorland',
          durationYears: 1,
          semanticVersion: '2.0.0',
          unit: 'ha',
          quantity: 4.5341,
          rateInPence: 2000,
          annualPaymentPence: 9068,
          sheetId: 'SD6162',
          parcelId: '1911'
        },
        2: {
          code: 'SPM4',
          semanticVersion: '1.5.0',
          quantity: 10.2
        }
      },
      agreementLevelItems: {
        1: {
          code: 'CMOR1',
          description:
            'Assess moorland and produce a written record - Agreement level part',
          durationYears: 1,
          version: 2,
          annualPaymentPence: 27200
        }
      },
      annualTotalPence: 36268,
      agreementTotalPence: 27200
    }

    const result = paymentCalculationTransformerV2(response)

    expect(result.parcelItems[1]).toEqual({
      code: 'UPL1',
      description: 'Moderate livestock grazing on moorland',
      durationYears: 1,
      version: '2.0.0',
      unit: 'ha',
      quantity: 4.5341,
      rateInPence: 2000,
      annualPaymentPence: 9068,
      sheetId: 'SD6162',
      parcelId: '1911'
    })
    expect(result.parcelItems[1].semanticVersion).toBeUndefined()
    expect(result.parcelItems[2].version).toBe('1.5.0')
    expect(result.parcelItems[2].semanticVersion).toBeUndefined()
    expect(result.agreementLevelItems).toEqual(response.agreementLevelItems)
    expect(result.annualTotalPence).toBe(36268)
    expect(result.agreementTotalPence).toBe(27200)
  })
})
