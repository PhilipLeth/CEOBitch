/**
 * Unit tests for Risk Assessor
 */

import { RiskAssessor } from '../../src/core/ceo-bitch/risk-assessor';
import { ExecutionReport, RiskCheck } from '../../src/types';

describe('RiskAssessor', () => {
  let assessor: RiskAssessor;

  beforeEach(() => {
    assessor = new RiskAssessor();
  });

  const createReport = (overrides: Partial<ExecutionReport> = {}): ExecutionReport => ({
    id: 'report-1',
    agentId: 'agent-1',
    orderId: 'order-1',
    status: 'requires_approval',
    output: { result: 'success' },
    logs: [],
    timestamp: new Date(),
    executionTimeMs: 1000,
    environment: 'staging',
    ...overrides,
  });

  describe('assessRisk', () => {
    it('should return low risk for clean report', () => {
      const report = createReport();
      const riskChecks: RiskCheck[] = [];

      const result = assessor.assessRisk(report, riskChecks);

      expect(result.overallRisk).toBe('low');
      expect(result.requiresHumanReview).toBe(false);
    });

    it('should detect error patterns', () => {
      const report = createReport({
        logs: [
          { timestamp: new Date(), level: 'error', message: 'Test error' },
        ],
      });
      const riskChecks: RiskCheck[] = [
        {
          id: 'error-check',
          name: 'Error Check',
          checkType: 'pattern',
          threshold: 0.2,
          action: 'require_approval',
          description: 'Check for errors',
        },
      ];

      const result = assessor.assessRisk(report, riskChecks);

      expect(result.riskFactors.length).toBeGreaterThan(0);
    });

    it('should require human review for high risk', () => {
      const report = createReport({
        output: null,
        logs: [
          { timestamp: new Date(), level: 'error', message: 'Critical error 1' },
          { timestamp: new Date(), level: 'error', message: 'Critical error 2' },
          { timestamp: new Date(), level: 'error', message: 'Critical error 3' },
          { timestamp: new Date(), level: 'error', message: 'Critical error 4' },
        ],
      });
      const riskChecks: RiskCheck[] = [
        {
          id: 'many-errors',
          name: 'many_errors',
          checkType: 'heuristic',
          threshold: 0.1,
          action: 'require_approval',
          description: 'Check for many errors',
        },
      ];

      const result = assessor.assessRisk(report, riskChecks);

      expect(result.requiresHumanReview).toBe(true);
    });

    it('should generate recommendations for risks', () => {
      const report = createReport({
        logs: [
          { timestamp: new Date(), level: 'error', message: 'Error occurred' },
        ],
      });
      const riskChecks: RiskCheck[] = [
        {
          id: 'error-check',
          name: 'error',
          checkType: 'pattern',
          threshold: 0.2,
          action: 'require_approval',
          description: 'Error detection',
        },
      ];

      const result = assessor.assessRisk(report, riskChecks);

      expect(result.recommendations).toBeDefined();
    });
  });
});
