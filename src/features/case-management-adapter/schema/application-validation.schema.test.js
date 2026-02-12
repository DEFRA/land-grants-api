import {
  caseManagementApplicationValidationRunRequestSchema,
  caseManagementApplicationValidationRunResponseSchema
} from './application-validation.schema.js'

describe('applicationValidationRunRequestSchema', () => {
  const validData = {
    id: 123
  }

  it('should validate valid data', () => {
    const { error } =
      caseManagementApplicationValidationRunRequestSchema.validate(validData)
    expect(error).toBeUndefined()
  })

  it('should require id as integer', () => {
    const data = { id: 'not-a-number' }
    const { error } =
      caseManagementApplicationValidationRunRequestSchema.validate(data)
    expect(error.details[0].message).toContain('id')
  })

  it('should require id', () => {
    const data = {}
    const { error } =
      caseManagementApplicationValidationRunRequestSchema.validate(data)
    expect(error.details[0].message).toContain('id')
  })
})

describe('caseManagementApplicationValidationRunResponseSchema', () => {
  describe('valid responses', () => {
    it('should validate a complete valid response with all component types', () => {
      const validResponse = {
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
                component: 'paragraph',
                text: 'Action code - CMOR1'
              },
              {
                component: 'details',
                summaryItems: [
                  {
                    text: 'Available area calculation',
                    classes: 'govuk-details__summary-text'
                  }
                ],
                items: [
                  {
                    component: 'paragraph',
                    text: 'Nested detail content'
                  }
                ]
              }
            ]
          }
        ]
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          validResponse
        )
      expect(error).toBeUndefined()
    })

    it('should validate response with paragraph component', () => {
      const validResponse = {
        message: 'Test message',
        response: [
          {
            component: 'paragraph',
            text: 'This is a paragraph'
          }
        ]
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          validResponse
        )
      expect(error).toBeUndefined()
    })

    it('should validate response with empty paragraph text', () => {
      const validResponse = {
        message: 'Test message',
        response: [
          {
            component: 'paragraph',
            text: ''
          }
        ]
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          validResponse
        )
      expect(error).toBeUndefined()
    })

    it('should validate response with heading component (with id)', () => {
      const validResponse = {
        message: 'Test message',
        response: [
          {
            component: 'heading',
            text: 'Main Title',
            level: 1,
            id: 'main-title'
          }
        ]
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          validResponse
        )
      expect(error).toBeUndefined()
    })

    it('should validate response with heading component (without id)', () => {
      const validResponse = {
        message: 'Test message',
        response: [
          {
            component: 'heading',
            text: 'Sub Title',
            level: 3
          }
        ]
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          validResponse
        )
      expect(error).toBeUndefined()
    })

    it('should validate all valid status colours', () => {
      const colours = ['red', 'green', 'yellow', 'blue', 'grey']

      colours.forEach((colour) => {
        const validResponse = {
          message: 'Test message',
          response: [
            {
              component: 'details',
              summaryItems: [
                {
                  component: 'status',
                  text: 'Status',
                  colour
                }
              ],
              items: [
                {
                  component: 'paragraph',
                  text: 'Content'
                }
              ]
            }
          ]
        }

        const { error } =
          caseManagementApplicationValidationRunResponseSchema.validate(
            validResponse
          )
        expect(error).toBeUndefined()
      })
    })

    it('should validate deeply nested details components', () => {
      const validResponse = {
        message: 'Test message',
        response: [
          {
            component: 'details',
            summaryItems: [
              {
                text: 'Level 1',
                classes: 'class-1'
              }
            ],
            items: [
              {
                component: 'details',
                summaryItems: [
                  {
                    text: 'Level 2',
                    classes: 'class-2'
                  }
                ],
                items: [
                  {
                    component: 'details',
                    summaryItems: [
                      {
                        text: 'Level 3',
                        classes: 'class-3'
                      }
                    ],
                    items: [
                      {
                        component: 'paragraph',
                        text: 'Deeply nested content'
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          validResponse
        )
      expect(error).toBeUndefined()
    })

    it('should validate details with multiple summary items', () => {
      const validResponse = {
        message: 'Test message',
        response: [
          {
            component: 'details',
            summaryItems: [
              {
                text: 'Summary 1',
                classes: 'class-1'
              },
              {
                component: 'status',
                text: 'Passed',
                colour: 'green'
              },
              {
                text: 'Summary 2',
                classes: 'class-2'
              }
            ],
            items: [
              {
                component: 'paragraph',
                text: 'Content'
              }
            ]
          }
        ]
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          validResponse
        )
      expect(error).toBeUndefined()
    })

    it('should validate details with multiple items', () => {
      const validResponse = {
        message: 'Test message',
        response: [
          {
            component: 'details',
            summaryItems: [
              {
                text: 'Summary',
                classes: 'class-1'
              }
            ],
            items: [
              {
                component: 'paragraph',
                text: 'First paragraph'
              },
              {
                component: 'paragraph',
                text: 'Second paragraph'
              },
              {
                component: 'heading',
                text: 'Section heading',
                level: 4
              }
            ]
          }
        ]
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          validResponse
        )
      expect(error).toBeUndefined()
    })
  })

  describe('invalid responses', () => {
    it('should reject response missing message', () => {
      const invalidResponse = {
        response: []
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          invalidResponse
        )
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('message')
    })

    it('should reject response missing response array', () => {
      const invalidResponse = {
        message: 'Test message'
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          invalidResponse
        )
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('response')
    })

    it('should reject paragraph missing text', () => {
      const invalidResponse = {
        message: 'Test message',
        response: [
          {
            component: 'paragraph'
          }
        ]
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          invalidResponse
        )
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain(
        'does not match any of the allowed types'
      )
    })

    it('should reject heading with invalid level (too low)', () => {
      const invalidResponse = {
        message: 'Test message',
        response: [
          {
            component: 'heading',
            text: 'Invalid heading',
            level: 0
          }
        ]
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          invalidResponse
        )
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain(
        'does not match any of the allowed types'
      )
    })

    it('should reject heading with invalid level (too high)', () => {
      const invalidResponse = {
        message: 'Test message',
        response: [
          {
            component: 'heading',
            text: 'Invalid heading',
            level: 7
          }
        ]
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          invalidResponse
        )
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain(
        'does not match any of the allowed types'
      )
    })

    it('should reject heading missing level', () => {
      const invalidResponse = {
        message: 'Test message',
        response: [
          {
            component: 'heading',
            text: 'Invalid heading'
          }
        ]
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          invalidResponse
        )
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain(
        'does not match any of the allowed types'
      )
    })

    it('should reject status with invalid colour', () => {
      const invalidResponse = {
        message: 'Test message',
        response: [
          {
            component: 'details',
            summaryItems: [
              {
                component: 'status',
                text: 'Status',
                colour: 'purple'
              }
            ],
            items: [
              {
                component: 'paragraph',
                text: 'Content'
              }
            ]
          }
        ]
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          invalidResponse
        )
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain(
        'does not match any of the allowed types'
      )
    })

    it('should reject status missing colour', () => {
      const invalidResponse = {
        message: 'Test message',
        response: [
          {
            component: 'details',
            summaryItems: [
              {
                component: 'status',
                text: 'Status'
              }
            ],
            items: [
              {
                component: 'paragraph',
                text: 'Content'
              }
            ]
          }
        ]
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          invalidResponse
        )
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain(
        'does not match any of the allowed types'
      )
    })

    it('should reject details with empty summaryItems array', () => {
      const invalidResponse = {
        message: 'Test message',
        response: [
          {
            component: 'details',
            summaryItems: [],
            items: [
              {
                component: 'paragraph',
                text: 'Content'
              }
            ]
          }
        ]
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          invalidResponse
        )
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain(
        'does not match any of the allowed types'
      )
    })

    it('should reject details with empty items array', () => {
      const invalidResponse = {
        message: 'Test message',
        response: [
          {
            component: 'details',
            summaryItems: [
              {
                text: 'Summary',
                classes: 'class-1'
              }
            ],
            items: []
          }
        ]
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          invalidResponse
        )
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain(
        'does not match any of the allowed types'
      )
    })

    it('should reject details missing summaryItems', () => {
      const invalidResponse = {
        message: 'Test message',
        response: [
          {
            component: 'details',
            items: [
              {
                component: 'paragraph',
                text: 'Content'
              }
            ]
          }
        ]
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          invalidResponse
        )
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain(
        'does not match any of the allowed types'
      )
    })

    it('should reject details missing items', () => {
      const invalidResponse = {
        message: 'Test message',
        response: [
          {
            component: 'details',
            summaryItems: [
              {
                text: 'Summary',
                classes: 'class-1'
              }
            ]
          }
        ]
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          invalidResponse
        )
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain(
        'does not match any of the allowed types'
      )
    })

    it('should reject summary item missing required classes', () => {
      const invalidResponse = {
        message: 'Test message',
        response: [
          {
            component: 'details',
            summaryItems: [
              {
                text: 'Summary'
              }
            ],
            items: [
              {
                component: 'paragraph',
                text: 'Content'
              }
            ]
          }
        ]
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          invalidResponse
        )
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain(
        'does not match any of the allowed types'
      )
    })

    it('should reject component with invalid component type', () => {
      const invalidResponse = {
        message: 'Test message',
        response: [
          {
            component: 'invalid-type',
            text: 'Some text'
          }
        ]
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          invalidResponse
        )
      expect(error).toBeDefined()
    })

    it('should reject response with non-array response field', () => {
      const invalidResponse = {
        message: 'Test message',
        response: 'not an array'
      }

      const { error } =
        caseManagementApplicationValidationRunResponseSchema.validate(
          invalidResponse
        )
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('response')
    })
  })
})
