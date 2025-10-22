import {
  applicationValidationRunToCaseManagement,
  createHeadingComponent,
  createParagraphComponent,
  createAvailableAreaDetails,
  createStatusComponent,
  createRuleDetails,
  createActionDetails
} from './application-validation.transformer.js'

describe('createHeadingComponent', () => {
  test('should create heading component with text and level', () => {
    const result = createHeadingComponent('Test Heading', 2)

    expect(result).toEqual({
      component: 'heading',
      text: 'Test Heading',
      level: 2,
      id: undefined
    })
  })

  test('should create heading component with text, level, and id', () => {
    const result = createHeadingComponent('Test Heading', 2, 'test-id')

    expect(result).toEqual({
      component: 'heading',
      text: 'Test Heading',
      level: 2,
      id: 'test-id'
    })
  })
})

describe('createParagraphComponent', () => {
  test('should create paragraph component with text', () => {
    const result = createParagraphComponent('This is a paragraph.')

    expect(result).toEqual({
      component: 'paragraph',
      text: 'This is a paragraph.'
    })
  })

  test('should return null when text is empty string', () => {
    const result = createParagraphComponent('')

    expect(result).toBeNull()
  })
})

describe('createAvailableAreaDetails', () => {
  test('should create details component with explanation sections', () => {
    const explanations = [
      {
        title: 'Section 1',
        content: ['Line 1', 'Line 2']
      },
      {
        title: 'Section 2',
        content: ['Line 3']
      },
      {
        title: 'Section 3',
        content: ['Line 4', 'Line 5', 'Line 6']
      }
    ]

    const result = createAvailableAreaDetails(explanations)

    expect(result).toEqual({
      component: 'details',
      summaryItems: [
        {
          text: 'Available area calculation explanation',
          classes: 'govuk-details__summary-text'
        }
      ],
      items: [
        { component: 'paragraph', text: 'Section 1' },
        { component: 'paragraph', text: 'Line 1' },
        { component: 'paragraph', text: 'Line 2' },
        { component: 'paragraph', text: 'Section 2' },
        { component: 'paragraph', text: 'Line 3' },
        { component: 'paragraph', text: 'Section 3' },
        { component: 'paragraph', text: 'Line 4' },
        { component: 'paragraph', text: 'Line 5' },
        { component: 'paragraph', text: 'Line 6' }
      ]
    })
  })

  test('should handle empty content array', () => {
    const explanations = [
      {
        title: 'Empty Section',
        content: []
      }
    ]

    const result = createAvailableAreaDetails(explanations)

    expect(result).toEqual({
      component: 'details',
      summaryItems: [
        {
          text: 'Available area calculation explanation',
          classes: 'govuk-details__summary-text'
        }
      ],
      items: [{ component: 'paragraph', text: 'Empty Section' }]
    })
  })

  test('should handle empty explanations array', () => {
    const explanations = []

    const result = createAvailableAreaDetails(explanations)

    expect(result).toEqual({
      component: 'details',
      summaryItems: [
        {
          text: 'Available area calculation explanation',
          classes: 'govuk-details__summary-text'
        }
      ],
      items: []
    })
  })

  test('should filter out null items from empty content strings', () => {
    const explanations = [
      {
        title: 'Section',
        content: ['', 'Valid content', '']
      }
    ]

    const result = createAvailableAreaDetails(explanations)

    expect(result).toEqual({
      component: 'details',
      summaryItems: [
        {
          text: 'Available area calculation explanation',
          classes: 'govuk-details__summary-text'
        }
      ],
      items: [
        { component: 'paragraph', text: 'Section' },
        { component: 'paragraph', text: 'Valid content' }
      ]
    })
  })
})

describe('createRuleDetails', () => {
  const rule = {
    name: 'parcel-has-intersection-with-data-layer-moorland',
    description: 'Is this parcel on the moorland?',
    passed: true,
    explanations: [
      {
        title: 'moorland check',
        lines: [
          'This parcel has a 99.99% intersection with the moorland layer.'
        ]
      }
    ]
  }

  test('should create rule details component for passed rule', () => {
    const result = createRuleDetails({ ...rule, passed: true })

    expect(result).toEqual({
      component: 'details',
      summaryItems: [
        {
          text: 'Is this parcel on the moorland?',
          classes: 'govuk-details__summary-text'
        },
        {
          classes: 'govuk-!-margin-left-8',
          component: 'status',
          text: 'Passed',
          colour: 'green'
        }
      ],
      items: [
        {
          component: 'paragraph',
          text: 'This parcel has a 99.99% intersection with the moorland layer.'
        }
      ]
    })
  })

  test('should create rule details component for failed rule', () => {
    const result = createRuleDetails({ ...rule, passed: false })

    expect(result).toEqual({
      component: 'details',
      summaryItems: [
        {
          text: 'Is this parcel on the moorland?',
          classes: 'govuk-details__summary-text'
        },
        {
          classes: 'govuk-!-margin-left-8',
          component: 'status',
          text: 'Failed',
          colour: 'red'
        }
      ],
      items: [
        {
          component: 'paragraph',
          text: 'This parcel has a 99.99% intersection with the moorland layer.'
        }
      ]
    })
  })

  test('should handle empty explanations array', () => {
    const rule = {
      name: 'test-rule',
      passed: true,
      explanations: []
    }

    const result = createRuleDetails(rule)

    expect(result.items).toHaveLength(0)
  })

  test('should handle explanation with empty lines array', () => {
    const rule = {
      name: 'test-rule',
      passed: false,
      explanations: [
        {
          title: 'Empty explanation',
          lines: []
        }
      ]
    }

    const result = createRuleDetails(rule)

    expect(result.items).toHaveLength(0)
  })

  test('should use friendly title for known rule names', () => {
    const rule = {
      name: 'applied-for-total-available-area',
      description: 'Has the total available area been applied for?',
      passed: true,
      explanations: []
    }

    const result = createRuleDetails(rule)

    expect(result.summaryItems[0].text).toBe(
      'Has the total available area been applied for?'
    )
  })

  test('should use original name for unknown rule names', () => {
    const rule = {
      name: 'unknown-custom-rule',
      description: 'unknown-custom-rule',
      passed: true,
      explanations: []
    }

    const result = createRuleDetails(rule)

    expect(result.summaryItems[0].text).toBe('unknown-custom-rule')
    expect(result.summaryItems[1]).toEqual({
      classes: 'govuk-!-margin-left-8',
      component: 'status',
      text: 'Passed',
      colour: 'green'
    })
  })

  test('should handle multiple explanations with multiple lines', () => {
    const rule = {
      name: 'test-rule',
      description: 'Test rule description',
      passed: true,
      explanations: [
        {
          title: 'First explanation',
          lines: ['Line 1', 'Line 2']
        },
        {
          title: 'Second explanation',
          lines: ['Line 3', 'Line 4', 'Line 5']
        }
      ]
    }

    const result = createRuleDetails(rule)

    expect(result.items).toEqual([
      { component: 'paragraph', text: 'Line 1' },
      { component: 'paragraph', text: 'Line 2' },
      { component: 'paragraph', text: 'Line 3' },
      { component: 'paragraph', text: 'Line 4' },
      { component: 'paragraph', text: 'Line 5' }
    ])
  })

  test('should filter out empty line explanations', () => {
    const rule = {
      name: 'test-rule',
      description: 'Test rule',
      passed: false,
      explanations: [
        {
          title: 'Explanation',
          lines: ['Valid line', '', 'Another valid line']
        }
      ]
    }

    const result = createRuleDetails(rule)

    expect(result.items).toEqual([
      { component: 'paragraph', text: 'Valid line' },
      { component: 'paragraph', text: 'Another valid line' }
    ])
  })
})

describe('createStatusComponent', () => {
  test('should create passed status component when hasPassed is true', () => {
    const result = createStatusComponent(true)

    expect(result).toEqual({
      classes: 'govuk-!-margin-left-8',
      component: 'status',
      text: 'Passed',
      colour: 'green'
    })
  })

  test('should create failed status component when hasPassed is false', () => {
    const result = createStatusComponent(false)

    expect(result).toEqual({
      classes: 'govuk-!-margin-left-8',
      component: 'status',
      text: 'Failed',
      colour: 'red'
    })
  })
})

describe('createActionDetails', () => {
  test('should create action details component with available area and rules', () => {
    const action = {
      code: 'SAM1',
      hasPassed: true,
      availableArea: {
        areaInHa: 10.5,
        explanations: [
          {
            title: 'Total valid land cover',
            content: ['Applied for: 10.50 ha', 'Available: 10.50 ha']
          }
        ]
      },
      rules: [
        {
          name: 'parcel-has-intersection-with-data-layer-moorland',
          description: 'Is this parcel on the moorland?',
          passed: true,
          explanations: [
            {
              title: 'moorland check',
              lines: [
                'This parcel has a 99.99% intersection with the moorland layer.'
              ]
            }
          ]
        }
      ]
    }

    const result = createActionDetails(action)

    expect(result).toEqual({
      component: 'details',
      summaryItems: [
        {
          text: 'SAM1',
          classes: 'govuk-details__summary-text'
        },
        {
          classes: 'govuk-!-margin-left-8',
          component: 'status',
          text: 'Passed',
          colour: 'green'
        }
      ],
      items: [
        {
          component: 'details',
          summaryItems: [
            {
              text: 'Available area calculation explanation',
              classes: 'govuk-details__summary-text'
            }
          ],
          items: [
            {
              component: 'paragraph',
              text: 'Total valid land cover'
            },
            {
              component: 'paragraph',
              text: 'Applied for: 10.50 ha'
            },
            {
              component: 'paragraph',
              text: 'Available: 10.50 ha'
            }
          ]
        },
        {
          component: 'details',
          summaryItems: [
            {
              text: 'Is this parcel on the moorland?',
              classes: 'govuk-details__summary-text'
            },
            {
              classes: 'govuk-!-margin-left-8',
              component: 'status',
              text: 'Passed',
              colour: 'green'
            }
          ],
          items: [
            {
              component: 'paragraph',
              text: 'This parcel has a 99.99% intersection with the moorland layer.'
            }
          ]
        }
      ]
    })
  })

  test('should handle action with empty rules array', () => {
    const action = {
      code: 'SAM4',
      hasPassed: true,
      rules: []
    }

    const result = createActionDetails(action)

    expect(result).toEqual({
      component: 'details',
      summaryItems: [
        {
          text: 'SAM4',
          classes: 'govuk-details__summary-text'
        },
        {
          classes: 'govuk-!-margin-left-8',
          component: 'status',
          text: 'Passed',
          colour: 'green'
        }
      ],
      items: []
    })
  })

  test('should handle action without availableArea', () => {
    const action = {
      code: 'TEST1',
      hasPassed: true,
      rules: [
        {
          name: 'test-rule',
          description: 'Test rule',
          passed: true,
          explanations: [
            {
              title: 'Test',
              lines: ['Test line']
            }
          ]
        }
      ]
    }

    const result = createActionDetails(action)

    expect(result).toEqual({
      component: 'details',
      summaryItems: [
        {
          text: 'TEST1',
          classes: 'govuk-details__summary-text'
        },
        {
          classes: 'govuk-!-margin-left-8',
          component: 'status',
          text: 'Passed',
          colour: 'green'
        }
      ],
      items: [
        {
          component: 'details',
          summaryItems: [
            {
              text: 'Test rule',
              classes: 'govuk-details__summary-text'
            },
            {
              classes: 'govuk-!-margin-left-8',
              component: 'status',
              text: 'Passed',
              colour: 'green'
            }
          ],
          items: [
            {
              component: 'paragraph',
              text: 'Test line'
            }
          ]
        }
      ]
    })
  })

  test('should handle action with failed status', () => {
    const action = {
      code: 'FAILED1',
      hasPassed: false,
      availableArea: {
        areaInHa: 5.0,
        explanations: [
          {
            title: 'Area Information',
            content: ['Total area: 5.0 ha']
          }
        ]
      },
      rules: [
        {
          name: 'failed-rule',
          description: 'This rule failed',
          passed: false,
          explanations: [
            {
              title: 'Failure reason',
              lines: ['Insufficient area']
            }
          ]
        }
      ]
    }

    const result = createActionDetails(action)

    expect(result.summaryItems[1]).toEqual({
      classes: 'govuk-!-margin-left-8',
      component: 'status',
      text: 'Failed',
      colour: 'red'
    })
    expect(result.items).toHaveLength(2) // available area details + 1 rule
  })

  test('should handle action with multiple rules', () => {
    const action = {
      code: 'MULTI1',
      hasPassed: true,
      rules: [
        {
          name: 'rule-1',
          description: 'First rule',
          passed: true,
          explanations: [
            {
              title: 'Rule 1',
              lines: ['Rule 1 passed']
            }
          ]
        },
        {
          name: 'rule-2',
          description: 'Second rule',
          passed: true,
          explanations: [
            {
              title: 'Rule 2',
              lines: ['Rule 2 passed']
            }
          ]
        }
      ]
    }

    const result = createActionDetails(action)

    expect(result.items).toHaveLength(2)
    expect(result.items[0].summaryItems[0].text).toBe('First rule')
    expect(result.items[1].summaryItems[0].text).toBe('Second rule')
  })

  test('should handle action with availableArea but empty explanations', () => {
    const action = {
      code: 'EMPTY_EXPLAIN',
      hasPassed: true,
      availableArea: {
        areaInHa: 10.0,
        explanations: []
      },
      rules: []
    }

    const result = createActionDetails(action)

    // Should have the availableArea details component even with empty explanations
    expect(result.items).toHaveLength(1)
    expect(result.items[0].component).toBe('details')
    expect(result.items[0].summaryItems[0].text).toBe(
      'Available area calculation explanation'
    )
    expect(result.items[0].items).toEqual([])
  })
})

describe('applicationValidationRunToCaseManagement', () => {
  test('should return null when input is null', () => {
    expect(applicationValidationRunToCaseManagement(null)).toBeNull()
  })

  test('should return null when input is undefined', () => {
    expect(applicationValidationRunToCaseManagement(undefined)).toBeNull()
  })

  test('should handle empty parcelLevelResults', () => {
    const input = {
      sbi: 106284736,
      date: '2025-09-30T08:29:21.263Z',
      hasPassed: true,
      parcelLevelResults: [],
      applicationLevelResults: {}
    }

    const result = applicationValidationRunToCaseManagement(input)

    expect(result).toEqual([
      {
        component: 'heading',
        text: 'Land parcel rules checks',
        level: 2,
        id: 'title'
      }
    ])
  })

  test('should handle multiple parcels', () => {
    const input = {
      sbi: 106284736,
      date: '2025-09-30T08:29:21.263Z',
      hasPassed: true,
      parcelLevelResults: [
        {
          sheetId: 'SD6743',
          parcelId: '8083',
          actions: [
            {
              code: 'ACTION1',
              hasPassed: true,
              rules: []
            }
          ]
        },
        {
          sheetId: 'SD6744',
          parcelId: '8084',
          actions: [
            {
              code: 'ACTION2',
              hasPassed: true,
              rules: []
            }
          ]
        }
      ],
      applicationLevelResults: {}
    }

    const result = applicationValidationRunToCaseManagement(input)

    expect(result).toHaveLength(5) // 1 title + 2 parcel headings + 2 actions
    expect(result[0]).toEqual({
      component: 'heading',
      text: 'Land parcel rules checks',
      level: 2,
      id: 'title'
    })
    expect(result[1]).toEqual({
      component: 'heading',
      text: 'Parcel ID: SD6743 8083 checks',
      level: 3,
      id: undefined
    })
    expect(result[2].summaryItems[0].text).toBe('ACTION1')
    expect(result[3]).toEqual({
      component: 'heading',
      text: 'Parcel ID: SD6744 8084 checks',
      level: 3,
      id: undefined
    })
    expect(result[4].summaryItems[0].text).toBe('ACTION2')
  })

  test('should handle parcel with no actions', () => {
    const input = {
      sbi: 106284736,
      date: '2025-09-30T08:29:21.263Z',
      hasPassed: true,
      parcelLevelResults: [
        {
          sheetId: 'SD6743',
          parcelId: '8083',
          actions: []
        }
      ],
      applicationLevelResults: {}
    }

    const result = applicationValidationRunToCaseManagement(input)

    expect(result).toHaveLength(2) // 1 title + 1 parcel heading
    expect(result[0]).toEqual({
      component: 'heading',
      text: 'Land parcel rules checks',
      level: 2,
      id: 'title'
    })
    expect(result[1]).toEqual({
      component: 'heading',
      text: 'Parcel ID: SD6743 8083 checks',
      level: 3,
      id: undefined
    })
  })

  test('should handle failed validation scenario', () => {
    const input = {
      sbi: 106284736,
      date: '2025-09-30T08:29:21.263Z',
      hasPassed: false,
      parcelLevelResults: [
        {
          sheetId: 'SD6743',
          parcelId: '8083',
          actions: [
            {
              code: 'FAILED_ACTION',
              hasPassed: false,
              rules: [
                {
                  name: 'failed-rule',
                  description: 'This rule failed',
                  passed: false,
                  explanations: [
                    {
                      title: 'Failure',
                      lines: ['Rule failed']
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      applicationLevelResults: {}
    }

    const result = applicationValidationRunToCaseManagement(input)

    expect(result).toHaveLength(3) // title + parcel heading + failed action
    const failedAction = result[2]
    expect(failedAction.summaryItems[1]).toEqual({
      classes: 'govuk-!-margin-left-8',
      component: 'status',
      text: 'Failed',
      colour: 'red'
    })
  })

  test('should return response when input is valid', () => {
    const input = {
      sbi: 106284736,
      date: '2025-09-30T08:29:21.263Z',
      hasPassed: false,
      requester: 'grants-ui',
      application: {
        parcels: [
          {
            actions: [
              {
                code: 'CMOR1',
                quantity: 4.53411071
              },
              {
                code: 'UPL1',
                quantity: 4.53411078
              }
            ],
            sheetId: 'SD6743',
            parcelId: '8083'
          }
        ],
        agreementLevelActions: []
      },
      applicantCrn: '1102838829',
      applicationId: 'app-validation-test1',
      parcelLevelResults: [
        {
          actions: [
            {
              code: 'CMOR1',
              rules: [
                {
                  name: 'parcel-has-intersection-with-data-layer-moorland',
                  description: 'Is this parcel on the moorland?',
                  passed: true,
                  reason: 'This parcel is majority on the moorland',
                  explanations: [
                    {
                      lines: [
                        'This parcel has a 99.99999599399895% intersection with the moorland layer. The target is 51%.'
                      ],
                      title: 'moorland check'
                    }
                  ]
                },
                {
                  name: 'applied-for-total-available-area',
                  description: 'Has the total available area been applied for?',
                  passed: true,
                  reason:
                    'There is not sufficient available area (4.53411078 ha) for the applied figure (4.53411071 ha)',
                  explanations: [
                    {
                      lines: [
                        'There is sufficient available area (4.5341 ha) for the applied figure (4.5341 ha)'
                      ],
                      title: 'Total valid land cover'
                    }
                  ]
                }
              ],
              hasPassed: true,
              availableArea: {
                areaInHa: 4.53411078,
                explanations: [
                  {
                    title: 'Application Information',
                    content: ['Action code - CMOR1', 'Parcel Id - SD6743 8083']
                  },
                  {
                    title: 'Land Covers For Parcel',
                    content: [
                      'Permanent grassland (130) Warning: This is a land cover class - 4.53411078 ha'
                    ]
                  },
                  {
                    title: 'Existing actions',
                    content: []
                  },
                  {
                    title: 'Valid land covers for action: CMOR1',
                    content: [
                      'Permanent grassland (130) - Permanent grassland (131)',
                      'Water/irrigation features (240) - Drain/ditch/dyke (241)',
                      'Water/irrigation features (240) - Pond (243)',
                      'Rock (250) - Scree (251)',
                      'Rock (250) - Boulders (252)',
                      'Rock (250) - Rocky outcrop (253)',
                      'Heaps (270) - Heaps (271)',
                      'Notional features (280) - Notional - rock (281)',
                      'Notional features (280) - Notional - bracken (282)',
                      'Notional features (280) - Notional - scrub (283)',
                      'Notional features (280) - Notional - water (285)',
                      'Notional features (280) - Notional - natural (286)',
                      'Notional features (280) - Notional - manmade (287)',
                      'Notional features (280) - Notional - mixed (288)',
                      'Non-agricultural area (300) - Non-agricultural area (300)',
                      'Woodland (330) - Scrub - ungrazeable (347)',
                      'Inland water (580) - Rivers and Streams Type 2 (582)',
                      'Inland water (580) - Rivers and Streams Type 3 (583)',
                      'Inland wetland (590) - Shingle (591)',
                      'Inland wetland (590) - Fen marsh & swamp (592)',
                      'Inland wetland (590) - Bog (593)',
                      'Coastal features (620) - Cliffs (621)',
                      'Natural transport - tracks and gallops (640) - Gallop (641)',
                      'Natural transport - tracks and gallops (640) - Track - natural surface (643)',
                      'Heath land and bracken (650) - Heath land and bracken - ungrazeable (651)'
                    ]
                  },
                  {
                    title: 'Total valid land covers',
                    content: [
                      'Permanent grassland (130) Warning: This is a land cover class - 4.53411078 ha',
                      '= 4.53411078 ha'
                    ]
                  },
                  {
                    title: 'Common land covers',
                    content: ['', 'Actions included for stacking:', '', 'None']
                  },
                  {
                    title:
                      'Find area of existing action that must be on the same land cover as CMOR1',
                    content: []
                  },
                  {
                    title: 'Stacks',
                    content: ['No existing actions so no stacks are needed']
                  },
                  {
                    title: 'Result',
                    content: [
                      'Total valid land cover: 4.53411078 ha',
                      '= 4.53411078 ha available for CMOR1'
                    ]
                  }
                ]
              },
              actionConfigVersion: ''
            },
            {
              code: 'UPL1',
              rules: [
                {
                  name: 'parcel-has-intersection-with-data-layer-moorland',
                  description: 'Is this parcel on the moorland?',
                  passed: true,
                  reason: 'This parcel is majority on the moorland',
                  explanations: [
                    {
                      lines: [
                        'This parcel has a 99.99999599399895% intersection with the moorland layer. The target is 51%.'
                      ],
                      title: 'moorland check'
                    }
                  ]
                },
                {
                  name: 'applied-for-total-available-area',
                  description: 'Has the total available area been applied for?',
                  passed: true,
                  reason:
                    'There is sufficient available area (4.53411078 ha) for the applied figure (4.53411078 ha)',
                  explanations: [
                    {
                      lines: [
                        'There is sufficient available area (4.5341 ha) for the applied figure (4.5341 ha)'
                      ],
                      title: 'Total valid land cover'
                    }
                  ]
                }
              ],
              hasPassed: true,
              availableArea: {
                areaInHa: 4.53411078,
                explanations: [
                  {
                    title: 'Application Information',
                    content: ['Action code - UPL1', 'Parcel Id - SD6743 8083']
                  },
                  {
                    title: 'Land Covers For Parcel',
                    content: [
                      'Permanent grassland (130) Warning: This is a land cover class - 4.53411078 ha'
                    ]
                  },
                  {
                    title: 'Existing actions',
                    content: []
                  },
                  {
                    title: 'Valid land covers for action: UPL1',
                    content: [
                      'Permanent grassland (130) - Permanent grassland (131)',
                      'Water/irrigation features (240) - Drain/ditch/dyke (241)',
                      'Water/irrigation features (240) - Pond (243)',
                      'Rock (250) - Scree (251)',
                      'Rock (250) - Boulders (252)',
                      'Rock (250) - Rocky outcrop (253)',
                      'Heaps (270) - Heaps (271)',
                      'Notional features (280) - Notional - rock (281)',
                      'Notional features (280) - Notional - bracken (282)',
                      'Notional features (280) - Notional - scrub (283)',
                      'Notional features (280) - Notional - water (285)',
                      'Notional features (280) - Notional - natural (286)',
                      'Notional features (280) - Notional - manmade (287)',
                      'Notional features (280) - Notional - mixed (288)',
                      'Non-agricultural area (300) - Non-agricultural area (300)',
                      'Woodland (330) - Scrub - ungrazeable (347)',
                      'Inland water (580) - Rivers and Streams Type 2 (582)',
                      'Inland water (580) - Rivers and Streams Type 3 (583)',
                      'Inland wetland (590) - Shingle (591)',
                      'Inland wetland (590) - Fen marsh & swamp (592)',
                      'Inland wetland (590) - Bog (593)',
                      'Coastal features (620) - Cliffs (621)',
                      'Natural transport - tracks and gallops (640) - Gallop (641)',
                      'Natural transport - tracks and gallops (640) - Track - natural surface (643)',
                      'Heath land and bracken (650) - Heath land and bracken - ungrazeable (651)'
                    ]
                  },
                  {
                    title: 'Total valid land covers',
                    content: [
                      'Permanent grassland (130) Warning: This is a land cover class - 4.53411078 ha',
                      '= 4.53411078 ha'
                    ]
                  },
                  {
                    title: 'Common land covers',
                    content: ['', 'Actions included for stacking:', '', 'None']
                  },
                  {
                    title:
                      'Find area of existing action that must be on the same land cover as UPL1',
                    content: []
                  },
                  {
                    title: 'Stacks',
                    content: ['No existing actions so no stacks are needed']
                  },
                  {
                    title: 'Result',
                    content: [
                      'Total valid land cover: 4.53411078 ha',
                      '= 4.53411078 ha available for UPL1'
                    ]
                  }
                ]
              },
              actionConfigVersion: ''
            }
          ],
          sheetId: 'SD6743',
          parcelId: '8083'
        }
      ],
      landGrantsApiVersion: 'unknown',
      applicationLevelResults: {}
    }

    const result = applicationValidationRunToCaseManagement(input)

    expect(result).toEqual([
      {
        component: 'heading',
        text: 'Land parcel rules checks',
        level: 2,
        id: 'title'
      },
      {
        component: 'heading',
        text: 'Parcel ID: SD6743 8083 checks',
        level: 3
      },
      {
        component: 'details',
        summaryItems: [
          {
            text: 'CMOR1',
            classes: 'govuk-details__summary-text'
          },
          {
            classes: 'govuk-!-margin-left-8',
            component: 'status',
            text: 'Passed',
            colour: 'green'
          }
        ],
        items: [
          {
            component: 'details',
            summaryItems: [
              {
                text: 'Available area calculation explanation',
                classes: 'govuk-details__summary-text'
              }
            ],
            items: [
              {
                component: 'paragraph',
                text: 'Application Information'
              },
              {
                component: 'paragraph',
                text: 'Action code - CMOR1'
              },
              {
                component: 'paragraph',
                text: 'Parcel Id - SD6743 8083'
              },
              {
                component: 'paragraph',
                text: 'Land Covers For Parcel'
              },
              {
                component: 'paragraph',
                text: 'Permanent grassland (130) Warning: This is a land cover class - 4.53411078 ha'
              },
              {
                component: 'paragraph',
                text: 'Existing actions'
              },
              {
                component: 'paragraph',
                text: 'Valid land covers for action: CMOR1'
              },
              {
                component: 'paragraph',
                text: 'Permanent grassland (130) - Permanent grassland (131)'
              },
              {
                component: 'paragraph',
                text: 'Water/irrigation features (240) - Drain/ditch/dyke (241)'
              },
              {
                component: 'paragraph',
                text: 'Water/irrigation features (240) - Pond (243)'
              },
              {
                component: 'paragraph',
                text: 'Rock (250) - Scree (251)'
              },
              {
                component: 'paragraph',
                text: 'Rock (250) - Boulders (252)'
              },
              {
                component: 'paragraph',
                text: 'Rock (250) - Rocky outcrop (253)'
              },
              {
                component: 'paragraph',
                text: 'Heaps (270) - Heaps (271)'
              },
              {
                component: 'paragraph',
                text: 'Notional features (280) - Notional - rock (281)'
              },
              {
                component: 'paragraph',
                text: 'Notional features (280) - Notional - bracken (282)'
              },
              {
                component: 'paragraph',
                text: 'Notional features (280) - Notional - scrub (283)'
              },
              {
                component: 'paragraph',
                text: 'Notional features (280) - Notional - water (285)'
              },
              {
                component: 'paragraph',
                text: 'Notional features (280) - Notional - natural (286)'
              },
              {
                component: 'paragraph',
                text: 'Notional features (280) - Notional - manmade (287)'
              },
              {
                component: 'paragraph',
                text: 'Notional features (280) - Notional - mixed (288)'
              },
              {
                component: 'paragraph',
                text: 'Non-agricultural area (300) - Non-agricultural area (300)'
              },
              {
                component: 'paragraph',
                text: 'Woodland (330) - Scrub - ungrazeable (347)'
              },
              {
                component: 'paragraph',
                text: 'Inland water (580) - Rivers and Streams Type 2 (582)'
              },
              {
                component: 'paragraph',
                text: 'Inland water (580) - Rivers and Streams Type 3 (583)'
              },
              {
                component: 'paragraph',
                text: 'Inland wetland (590) - Shingle (591)'
              },
              {
                component: 'paragraph',
                text: 'Inland wetland (590) - Fen marsh & swamp (592)'
              },
              {
                component: 'paragraph',
                text: 'Inland wetland (590) - Bog (593)'
              },
              {
                component: 'paragraph',
                text: 'Coastal features (620) - Cliffs (621)'
              },
              {
                component: 'paragraph',
                text: 'Natural transport - tracks and gallops (640) - Gallop (641)'
              },
              {
                component: 'paragraph',
                text: 'Natural transport - tracks and gallops (640) - Track - natural surface (643)'
              },
              {
                component: 'paragraph',
                text: 'Heath land and bracken (650) - Heath land and bracken - ungrazeable (651)'
              },
              {
                component: 'paragraph',
                text: 'Total valid land covers'
              },
              {
                component: 'paragraph',
                text: 'Permanent grassland (130) Warning: This is a land cover class - 4.53411078 ha'
              },
              {
                component: 'paragraph',
                text: '= 4.53411078 ha'
              },
              {
                component: 'paragraph',
                text: 'Common land covers'
              },
              {
                component: 'paragraph',
                text: 'Actions included for stacking:'
              },
              {
                component: 'paragraph',
                text: 'None'
              },
              {
                component: 'paragraph',
                text: 'Find area of existing action that must be on the same land cover as CMOR1'
              },
              {
                component: 'paragraph',
                text: 'Stacks'
              },
              {
                component: 'paragraph',
                text: 'No existing actions so no stacks are needed'
              },
              {
                component: 'paragraph',
                text: 'Result'
              },
              {
                component: 'paragraph',
                text: 'Total valid land cover: 4.53411078 ha'
              },
              {
                component: 'paragraph',
                text: '= 4.53411078 ha available for CMOR1'
              }
            ]
          },
          {
            component: 'details',
            summaryItems: [
              {
                text: 'Is this parcel on the moorland?',
                classes: 'govuk-details__summary-text'
              },
              {
                classes: 'govuk-!-margin-left-8',
                component: 'status',
                text: 'Passed',
                colour: 'green'
              }
            ],
            items: [
              {
                component: 'paragraph',
                text: 'This parcel has a 99.99999599399895% intersection with the moorland layer. The target is 51%.'
              }
            ]
          },
          {
            component: 'details',
            summaryItems: [
              {
                text: 'Has the total available area been applied for?',
                classes: 'govuk-details__summary-text'
              },
              {
                classes: 'govuk-!-margin-left-8',
                component: 'status',
                text: 'Passed',
                colour: 'green'
              }
            ],
            items: [
              {
                component: 'paragraph',
                text: 'There is sufficient available area (4.5341 ha) for the applied figure (4.5341 ha)'
              }
            ]
          }
        ]
      },
      {
        component: 'details',
        summaryItems: [
          {
            text: 'UPL1',
            classes: 'govuk-details__summary-text'
          },
          {
            classes: 'govuk-!-margin-left-8',
            component: 'status',
            text: 'Passed',
            colour: 'green'
          }
        ],
        items: [
          {
            component: 'details',
            summaryItems: [
              {
                text: 'Available area calculation explanation',
                classes: 'govuk-details__summary-text'
              }
            ],
            items: [
              {
                component: 'paragraph',
                text: 'Application Information'
              },
              {
                component: 'paragraph',
                text: 'Action code - UPL1'
              },
              {
                component: 'paragraph',
                text: 'Parcel Id - SD6743 8083'
              },
              {
                component: 'paragraph',
                text: 'Land Covers For Parcel'
              },
              {
                component: 'paragraph',
                text: 'Permanent grassland (130) Warning: This is a land cover class - 4.53411078 ha'
              },
              {
                component: 'paragraph',
                text: 'Existing actions'
              },
              {
                component: 'paragraph',
                text: 'Valid land covers for action: UPL1'
              },
              {
                component: 'paragraph',
                text: 'Permanent grassland (130) - Permanent grassland (131)'
              },
              {
                component: 'paragraph',
                text: 'Water/irrigation features (240) - Drain/ditch/dyke (241)'
              },
              {
                component: 'paragraph',
                text: 'Water/irrigation features (240) - Pond (243)'
              },
              {
                component: 'paragraph',
                text: 'Rock (250) - Scree (251)'
              },
              {
                component: 'paragraph',
                text: 'Rock (250) - Boulders (252)'
              },
              {
                component: 'paragraph',
                text: 'Rock (250) - Rocky outcrop (253)'
              },
              {
                component: 'paragraph',
                text: 'Heaps (270) - Heaps (271)'
              },
              {
                component: 'paragraph',
                text: 'Notional features (280) - Notional - rock (281)'
              },
              {
                component: 'paragraph',
                text: 'Notional features (280) - Notional - bracken (282)'
              },
              {
                component: 'paragraph',
                text: 'Notional features (280) - Notional - scrub (283)'
              },
              {
                component: 'paragraph',
                text: 'Notional features (280) - Notional - water (285)'
              },
              {
                component: 'paragraph',
                text: 'Notional features (280) - Notional - natural (286)'
              },
              {
                component: 'paragraph',
                text: 'Notional features (280) - Notional - manmade (287)'
              },
              {
                component: 'paragraph',
                text: 'Notional features (280) - Notional - mixed (288)'
              },
              {
                component: 'paragraph',
                text: 'Non-agricultural area (300) - Non-agricultural area (300)'
              },
              {
                component: 'paragraph',
                text: 'Woodland (330) - Scrub - ungrazeable (347)'
              },
              {
                component: 'paragraph',
                text: 'Inland water (580) - Rivers and Streams Type 2 (582)'
              },
              {
                component: 'paragraph',
                text: 'Inland water (580) - Rivers and Streams Type 3 (583)'
              },
              {
                component: 'paragraph',
                text: 'Inland wetland (590) - Shingle (591)'
              },
              {
                component: 'paragraph',
                text: 'Inland wetland (590) - Fen marsh & swamp (592)'
              },
              {
                component: 'paragraph',
                text: 'Inland wetland (590) - Bog (593)'
              },
              {
                component: 'paragraph',
                text: 'Coastal features (620) - Cliffs (621)'
              },
              {
                component: 'paragraph',
                text: 'Natural transport - tracks and gallops (640) - Gallop (641)'
              },
              {
                component: 'paragraph',
                text: 'Natural transport - tracks and gallops (640) - Track - natural surface (643)'
              },
              {
                component: 'paragraph',
                text: 'Heath land and bracken (650) - Heath land and bracken - ungrazeable (651)'
              },
              {
                component: 'paragraph',
                text: 'Total valid land covers'
              },
              {
                component: 'paragraph',
                text: 'Permanent grassland (130) Warning: This is a land cover class - 4.53411078 ha'
              },
              {
                component: 'paragraph',
                text: '= 4.53411078 ha'
              },
              {
                component: 'paragraph',
                text: 'Common land covers'
              },
              {
                component: 'paragraph',
                text: 'Actions included for stacking:'
              },
              {
                component: 'paragraph',
                text: 'None'
              },
              {
                component: 'paragraph',
                text: 'Find area of existing action that must be on the same land cover as UPL1'
              },
              {
                component: 'paragraph',
                text: 'Stacks'
              },
              {
                component: 'paragraph',
                text: 'No existing actions so no stacks are needed'
              },
              {
                component: 'paragraph',
                text: 'Result'
              },
              {
                component: 'paragraph',
                text: 'Total valid land cover: 4.53411078 ha'
              },
              {
                component: 'paragraph',
                text: '= 4.53411078 ha available for UPL1'
              }
            ]
          },
          {
            component: 'details',
            summaryItems: [
              {
                text: 'Is this parcel on the moorland?',
                classes: 'govuk-details__summary-text'
              },
              {
                classes: 'govuk-!-margin-left-8',
                component: 'status',
                text: 'Passed',
                colour: 'green'
              }
            ],
            items: [
              {
                component: 'paragraph',
                text: 'This parcel has a 99.99999599399895% intersection with the moorland layer. The target is 51%.'
              }
            ]
          },
          {
            component: 'details',
            summaryItems: [
              {
                text: 'Has the total available area been applied for?',
                classes: 'govuk-details__summary-text'
              },
              {
                classes: 'govuk-!-margin-left-8',
                component: 'status',
                text: 'Passed',
                colour: 'green'
              }
            ],
            items: [
              {
                component: 'paragraph',
                text: 'There is sufficient available area (4.5341 ha) for the applied figure (4.5341 ha)'
              }
            ]
          }
        ]
      }
    ])
  })
})
