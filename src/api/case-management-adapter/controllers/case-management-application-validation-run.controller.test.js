import Hapi from '@hapi/hapi'
import { application } from '../index.js'
import { getApplicationValidationRun } from '~/src/api/application/queries/getApplicationValidationRun.query.js'

jest.mock('~/src/api/application/queries/getApplicationValidationRun.query.js')

describe('Application Validation Run Controller', () => {
  const server = Hapi.server()

  beforeAll(async () => {
    server.decorate('request', 'logger', {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn()
    })

    server.decorate('server', 'postgresDb', {
      connect: jest.fn().mockImplementation(() => ({
        query: jest.fn(),
        release: jest.fn()
      }))
    })

    await server.register([application])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /application/{id}/validation-run', () => {
    test('should return 200 and application validation run', async () => {
      const applicationValidationRun = {
        id: 1,
        application_id: '123456789',
        sbi: '123456789',
        crn: '123456789',
        data: {
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
                    [
                      {
                        name: 'parcel-has-intersection-with-data-layer-moorland',
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
                        passed: false,
                        reason:
                          'There is not sufficient available area (4.53411078 ha) for the applied figure (4.53411071 ha)',
                        explanations: [
                          {
                            lines: [
                              'Applied for: 4.53411071 ha',
                              'Parcel area: 4.53411078 ha'
                            ],
                            title: 'Total valid land cover'
                          }
                        ]
                      }
                    ]
                  ],
                  hasPassed: false,
                  availableArea: {
                    areaInHa: 4.53411078,
                    explanations: [
                      {
                        title: 'Application Information',
                        content: [
                          'Action code - CMOR1',
                          'Parcel Id - SD6743 8083'
                        ]
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
                        content: [
                          '',
                          'Actions included for stacking:',
                          '',
                          'None'
                        ]
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
                    [
                      {
                        name: 'parcel-has-intersection-with-data-layer-moorland',
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
                        passed: true,
                        reason:
                          'There is sufficient available area (4.53411078 ha) for the applied figure (4.53411078 ha)',
                        explanations: [
                          {
                            lines: [
                              'Applied for: 4.53411078 ha',
                              'Parcel area: 4.53411078 ha'
                            ],
                            title: 'Total valid land cover'
                          }
                        ]
                      }
                    ]
                  ],
                  hasPassed: true,
                  availableArea: {
                    areaInHa: 4.53411078,
                    explanations: [
                      {
                        title: 'Application Information',
                        content: [
                          'Action code - UPL1',
                          'Parcel Id - SD6743 8083'
                        ]
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
                        content: [
                          '',
                          'Actions included for stacking:',
                          '',
                          'None'
                        ]
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
      }

      getApplicationValidationRun.mockResolvedValue(applicationValidationRun)

      const request = {
        method: 'GET',
        url: '/case-management-adapter/application/validation-run/123'
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)
      expect(statusCode).toBe(200)

      expect(result).toEqual({
        message: 'Application validation run retrieved successfully',
        response: [
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
                text: 'Failed',
                colour: 'red'
              }
            ],
            items: [
              {
                component: 'details',
                summaryItems: [
                  {
                    text: 'Available area calculation explaination',
                    classes: 'govuk-details__summary-text'
                  }
                ],
                items: [
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
                    text: 'Permanent grassland (130) Warning: This is a land cover class - 4.53411078 ha'
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
                    text: 'Permanent grassland (130) Warning: This is a land cover class - 4.53411078 ha'
                  },
                  {
                    component: 'paragraph',
                    text: '= 4.53411078 ha'
                  },
                  {
                    component: 'paragraph',
                    text: ''
                  },
                  {
                    component: 'paragraph',
                    text: 'Actions included for stacking:'
                  },
                  {
                    component: 'paragraph',
                    text: ''
                  },
                  {
                    component: 'paragraph',
                    text: 'None'
                  },
                  {
                    component: 'paragraph',
                    text: 'No existing actions so no stacks are needed'
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
                    text: 'Is this parcel on the moorland',
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
                    text: 'This parcel has a 99.99999599399895% intersection with the moorland layer. The target is 51%.'
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
                    text: 'Available area calculation explaination',
                    classes: 'govuk-details__summary-text'
                  }
                ],
                items: [
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
                    text: 'Permanent grassland (130) Warning: This is a land cover class - 4.53411078 ha'
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
                    text: 'Permanent grassland (130) Warning: This is a land cover class - 4.53411078 ha'
                  },
                  {
                    component: 'paragraph',
                    text: '= 4.53411078 ha'
                  },
                  {
                    component: 'paragraph',
                    text: ''
                  },
                  {
                    component: 'paragraph',
                    text: 'Actions included for stacking:'
                  },
                  {
                    component: 'paragraph',
                    text: ''
                  },
                  {
                    component: 'paragraph',
                    text: 'None'
                  },
                  {
                    component: 'paragraph',
                    text: 'No existing actions so no stacks are needed'
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
                    text: 'Is this parcel on the moorland',
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
                    text: 'This parcel has a 99.99999599399895% intersection with the moorland layer. The target is 51%.'
                  }
                ]
              }
            ]
          }
        ]
      })
    })

    test('should return 404 if application validation run does not exist', async () => {
      getApplicationValidationRun.mockResolvedValue(null)

      const request = {
        method: 'GET',
        url: '/case-management-adapter/application/validation-run/123'
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)

      expect(statusCode).toBe(404)
      expect(result.message).toBe('Application validation run not found')
    })

    test('should return 500 if application validation run query fails', async () => {
      getApplicationValidationRun.mockRejectedValue(
        new Error('Error getting application validation run')
      )

      const request = {
        method: 'GET',
        url: '/case-management-adapter/application/validation-run/123'
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)

      expect(statusCode).toBe(500)
      expect(result.message).toBe('An internal server error occurred')
    })
  })
})
