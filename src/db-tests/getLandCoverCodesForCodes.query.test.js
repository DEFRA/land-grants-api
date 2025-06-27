import { getLandCoverCodesForCodes } from '../api/land-cover-codes/queries/getLandCoverCodes.query.js'
import landCoverCodesModel from '../api/land-cover-codes/models/land-cover-codes.model.js'
import landCoverCodes from '../api/common/helpers/seed-data/land-cover-codes.js'
import {
  connectMongo,
  seedMongo,
  closeMongo
} from '~/src/db-tests/setup/utils.js'

const logger = {
  info: jest.fn(),
  error: jest.fn()
}

describe('Get land cover codes', () => {
  beforeAll(async () => {
    await connectMongo()
    await seedMongo(landCoverCodesModel, 'land-cover-codes', landCoverCodes)
  })

  afterAll(async () => {
    await closeMongo()
  })

  test('should return all land cover codes for 130', async () => {
    const landCovers = await getLandCoverCodesForCodes(['130'], logger)
    expect(landCovers).toEqual(['130', '131', '132'])
    expect(true).toBe(true)
  })

  test('should return all land cover codes', async () => {
    const codes = [
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

    const expectedLandCoverCodes = [
      '130',
      '131',
      '132',
      '240',
      '241',
      '243',
      '250',
      '251',
      '252',
      '253',
      '270',
      '271',
      '280',
      '281',
      '282',
      '283',
      '284',
      '285',
      '286',
      '287',
      '288',
      '300',
      '330',
      '331',
      '332',
      '334',
      '335',
      '336',
      '337',
      '338',
      '339',
      '341',
      '342',
      '343',
      '344',
      '345',
      '346',
      '347',
      '580',
      '581',
      '582',
      '583',
      '588',
      '590',
      '591',
      '592',
      '593',
      '620',
      '621',
      '622',
      '623',
      '640',
      '641',
      '642',
      '643',
      '650',
      '651'
    ]

    const landCoverCodes = await getLandCoverCodesForCodes(codes, logger)
    expect(landCoverCodes).toEqual(expectedLandCoverCodes)
  })
})
