import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import { landController } from '~/src/api/land/controllers/land-controller.js'

jest.mock('~/src/data/parcel-data.json', () => [
  {
    sheetId: 'SX0679',
    parcelId: 9999,
    name: 'Test Parcel',
    actions: [
      {
        code: 'ACTION1',
        description: 'Test Action 1',
        availableArea: 100,
        someOtherProp: 'should be removed'
      },
      {
        code: 'ACTION2',
        description: 'Test Action 2',
        availableArea: 200,
        anotherProp: 'should be removed too'
      }
    ],
    someExtraProp: 'should be preserved'
  }
])

describe('Land Controller', () => {
  let request
  let h
  let responseMock
  let codeMock

  beforeEach(() => {
    codeMock = jest.fn().mockReturnThis()
    responseMock = jest.fn().mockReturnValue({ code: codeMock })
    h = { response: responseMock }
  })

  describe('handler', () => {
    it('should return parcel data when parcel is found', async () => {
      // Arrange
      request = {
        params: {
          id: 'SX0679-9999'
        }
      }

      await landController.handler(request, h)

      expect(responseMock).toHaveBeenCalledWith({
        message: 'success',
        parcel: {
          sheetId: 'SX0679',
          parcelId: 9999,
          name: 'Test Parcel',
          actions: [
            {
              code: 'ACTION1',
              description: 'Test Action 1',
              availableArea: 100
            },
            {
              code: 'ACTION2',
              description: 'Test Action 2',
              availableArea: 200
            }
          ],
          someExtraProp: 'should be preserved'
        }
      })
      expect(codeMock).toHaveBeenCalledWith(statusCodes.ok)
    })

    it('should return 404 when parcel is not found', async () => {
      // Arrange
      request = {
        params: {
          id: 'NONEXISTENT-1234'
        }
      }

      await landController.handler(request, h)

      // Assert
      expect(responseMock).toHaveBeenCalledWith({ message: 'Parcel not found' })
      expect(codeMock).toHaveBeenCalledWith(statusCodes.notFound)
    })

    it('should transform the parcel data correctly', async () => {
      // Arrange
      request = {
        params: {
          id: 'SX0679-9999'
        }
      }

      await landController.handler(request, h)

      expect(responseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          parcel: expect.objectContaining({
            actions: expect.arrayContaining([
              expect.objectContaining({
                code: 'ACTION1',
                description: 'Test Action 1',
                availableArea: 100
              }),
              expect.objectContaining({
                code: 'ACTION2',
                description: 'Test Action 2',
                availableArea: 200
              })
            ])
          })
        })
      )

      expect(
        responseMock.mock.calls[0][0].parcel.actions[0]
      ).not.toHaveProperty('someOtherProp')
      expect(
        responseMock.mock.calls[0][0].parcel.actions[1]
      ).not.toHaveProperty('anotherProp')
    })
  })
})
