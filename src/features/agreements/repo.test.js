import * as dal from '~/src/services/dal/index.js';
import * as db from '~/src/features/agreements/queries/getAgreementsForParcel.query.js';
import { getAgreements } from '~/src/features/agreements/repo.js';

vi.mock('~/src/features/agreements/queries/getAgreementsForParcel.query.js');
vi.mock('~/src/services/dal/index.js');

const sbi = '012345678';
const sheetId = 'dummy-sheet';
const parcelId = 'dummy-parcel';
const token = 'dummy-defra-id-token';
const mockLogger = { info: vi.fn() };

// Default dates which are valid for today (with fake timer)
const startDate = new Date('2025-01-01');
const endDate = new Date('2027-01-01');

describe('getAgreements', () => {
  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date('2025-12-01T00:00:00.000Z'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should fetch agreements from both the DB and the DAL', async () => {
    const dbAgreements = [
      {
        actionCode: 'UPL1',
        quantity: 100,
        unit: 'sqm',
        startDate,
        endDate
      },
      {
        actionCode: 'UPL2',
        quantity: 10000,
        unit: 'sqm',
        startDate,
        endDate
      }
    ];
    const dalAgreements = [
      {
        actionCode: 'CMOR1',
        quantity: 15000,
        unit: 'sqm',
        startDate,
        endDate
      },
      {
        actionCode: 'CMOR2',
        quantity: 17000,
        unit: 'sqm',
        startDate,
        endDate
      }
    ];

    db.getAgreementsForParcel.mockResolvedValue(dbAgreements);
    dal.getAgreements.mockResolvedValue(dalAgreements);

    const result = await getAgreements(
      sbi,
      sheetId,
      parcelId,
      token,
      null,
      mockLogger
    );

    expect(db.getAgreementsForParcel).toHaveBeenCalledWith(
      sheetId,
      parcelId,
      null,
      mockLogger
    );
    expect(dal.getAgreements).toHaveBeenCalledWith(
      sbi,
      parcelId,
      sheetId,
      token,
      mockLogger
    );

    expect(result).toEqual([...dbAgreements, ...dalAgreements]);
  });

  it('should filter out non-area agreements', async () => {
    const dbAgreementCount = {
      actionCode: 'AF1',
      quantity: 800,
      unit: 'count',
      startDate,
      endDate
    };

    const dbAgreementArea = {
      actionCode: 'UPL1',
      quantity: 100,
      unit: 'sqm',
      startDate,
      endDate
    };

    const dalAgreementLength = {
      actionCode: 'SPM4',
      quantity: 200,
      unit: 'm',
      startDate,
      endDate
    };
    const dalAgreementArea = {
      actionCode: 'CMOR1',
      quantity: 15000,
      unit: 'sqm',
      startDate,
      endDate
    };

    db.getAgreementsForParcel.mockResolvedValue([
      dbAgreementCount,
      dbAgreementArea
    ]);
    dal.getAgreements.mockResolvedValue([dalAgreementLength, dalAgreementArea]);

    const result = await getAgreements(
      sbi,
      sheetId,
      parcelId,
      token,
      null,
      mockLogger
    );

    expect(db.getAgreementsForParcel).toHaveBeenCalledWith(
      sheetId,
      parcelId,
      null,
      mockLogger
    );
    expect(dal.getAgreements).toHaveBeenCalledWith(
      sbi,
      parcelId,
      sheetId,
      token,
      mockLogger
    );

    expect(result).toEqual([dbAgreementArea, dalAgreementArea]);
  });

  test.each([
    {
      scenario: 'expired actions',
      filteredAction: {
        actionCode: 'UPL1',
        quantity: 100,
        unit: 'sqm',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-11-30')
      }
    },
    {
      scenario: 'actions not yet started',
      filteredAction: {
        actionCode: 'UPL1',
        quantity: 100,
        unit: 'sqm',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31')
      }
    },
    {
      scenario: 'actions where end date is today',
      filteredAction: {
        actionCode: 'UPL1',
        quantity: 100,
        unit: 'sqm',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-01')
      }
    }
  ])('should exclude $scenario', async ({ filteredAction }) => {
    const sheetId = 'SH123';
    const parcelId = 'PA456';

    const goodAction = {
      actionCode: 'UPL1',
      quantity: 100,
      unit: 'sqm',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2030-11-31')
    };

    db.getAgreementsForParcel.mockResolvedValue([goodAction, filteredAction]);
    dal.getAgreements.mockResolvedValue([filteredAction]);

    const result = await getAgreements(
      sbi,
      sheetId,
      parcelId,
      token,
      null,
      mockLogger
    );

    expect(result).toEqual([goodAction]);
  });

  test('should include actions starting today', async () => {
    const goodAction = {
      actionCode: 'UPL1',
      quantity: 100,
      unit: 'sqm',
      startDate: new Date('2025-12-01'),
      endDate
    };

    db.getAgreementsForParcel.mockResolvedValue([goodAction]);
    dal.getAgreements.mockResolvedValue([goodAction]);

    const result = await getAgreements(
      sbi,
      sheetId,
      parcelId,
      token,
      null,
      mockLogger
    );

    expect(result).toEqual([goodAction, goodAction]);
  });
});
