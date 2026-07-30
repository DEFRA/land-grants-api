import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateWoodlandManagementPlan, calculateWMPPayment } from './wmp-service.js';
import { executeRules } from '~/src/features/rules-engine/rulesEngine.js';
import { getEnabledActions } from '../../actions/queries/getEnabledActions.query.js';
import { rules } from '~/src/features/rules-engine/rules/index.js';
import { haToSqm } from '../../common/helpers/measurement.js';
import { getActionsByLatestVersion } from '../../actions/queries/2.0.0/getActionsByLatestVersion.query.js';

vi.mock('~/src/features/parcel/queries/getLandData.query.js');
vi.mock('~/src/features/rules-engine/rulesEngine.js');
vi.mock('~/src/features/rules-engine/rules/index.js', () => ({ rules: [] }));
vi.mock('../../actions/queries/getEnabledActions.query.js');
vi.mock('../../actions/queries/2.0.0/getActionsByLatestVersion.query.js');

const mockGetActionsByLatestVersion = getActionsByLatestVersion
const mockParcels = [{ area: 100 }, { area: 100 }];

describe('validateWoodlandManagementPlan', () => {
  let mockRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      payload: {
        parcelIds: ['parcel1', 'parcel2'],
        oldWoodlandAreaHa: 10,
        newWoodlandAreaHa: 5
      },
      logger: {
        info: vi.fn(),
        error: vi.fn()
      },
      server: {
        postgresDb: {}
      }
    };
  });

  it('should calculate total area correctly and successfully validate woodland management plan', async () => {
    getEnabledActions.mockResolvedValue([{ code: 'PA3', rules: ['ruleA'] }]);
    executeRules.mockReturnValue({ passed: true, results: [] });

    const result = await validateWoodlandManagementPlan(
      mockParcels,
      mockRequest
    );

    expect(getEnabledActions).toHaveBeenCalledWith(
      mockRequest.logger,
      mockRequest.server.postgresDb
    );

    expect(executeRules).toHaveBeenCalledWith(
      rules,
      {
        oldWoodlandAreaSqm: haToSqm(10),
        newWoodlandAreaSqm: haToSqm(5),
        totalParcelAreaSqm: 200
      },
      ['ruleA']
    );

    expect(result).toEqual({
      action: { code: 'PA3', rules: ['ruleA'] },
      ruleResult: { passed: true, results: [] }
    });
  });

  it('should default total area to 0 when no parcels are provided', async () => {
    getEnabledActions.mockResolvedValue([{ code: 'PA3', rules: ['ruleA'] }]);
    executeRules.mockReturnValue({ passed: true, results: [] });

    const result = await validateWoodlandManagementPlan(null, mockRequest);

    expect(getEnabledActions).toHaveBeenCalledWith(
      mockRequest.logger,
      mockRequest.server.postgresDb
    );

    expect(executeRules).toHaveBeenCalledWith(
      rules,
      {
        oldWoodlandAreaSqm: haToSqm(10),
        newWoodlandAreaSqm: haToSqm(5),
        totalParcelAreaSqm: 0
      },
      ['ruleA']
    );

    expect(result).toEqual({
      action: { code: 'PA3', rules: ['ruleA'] },
      ruleResult: { passed: true, results: [] }
    });
  });
});

describe('calculateWMPPayment', () => {

  const createMockAction = () => ({
    id: 1,
    code: 'PA3',
    description: 'Woodland Management Plan',
    semanticVersion: '1.1.0',
    durationYears: 5,
    rules: [],
    paymentMethod: {
      name: 'wmp-calculation',
      version: '1.0.0',
      config: {
        newWoodlandMaxPercent: 20,
        tiers: [
          {
            lowerLimitHa: 0.5,
            upperLimitHa: 51,
            flatRateGbp: 1500,
            ratePerUnitGbp: 0
          },
          {
            lowerLimitHa: 50,
            upperLimitHa: 100,
            flatRateGbp: 1500,
            ratePerUnitGbp: 30
          },
          {
            lowerLimitHa: 100,
            upperLimitHa: null,
            flatRateGbp: 3000,
            ratePerUnitGbp: 15
          }
        ]
      }
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fail as action not found", async () => {
    mockGetActionsByLatestVersion.mockResolvedValue([])

    await expect(calculateWMPPayment({}, {}, {})).rejects.toThrow()
  })

  it("should return payment result and action", async () => {
    mockGetActionsByLatestVersion.mockResolvedValue([createMockAction()])

    const { result, action } = await calculateWMPPayment({}, {}, {
      totalWoodlandAreaSqm: 10000
    })

    expect(result).not.toBeNull();
    expect(result.eligibleArea).toBe(1);
    expect(result.payment).toBe(1500);
    expect(action).not.toBeNull();
    expect(action.code).toBe('PA3');
  })
})
