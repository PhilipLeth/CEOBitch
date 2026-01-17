/**
 * Unit tests for Quality Evaluator
 */

import { QualityEvaluator } from '../../src/core/ceo-bitch/quality-evaluator';
import { ExecutionReport, QualityCriteria } from '../../src/types';

describe('QualityEvaluator', () => {
  let evaluator: QualityEvaluator;

  beforeEach(() => {
    evaluator = new QualityEvaluator();
  });

  const createReport = (overrides: Partial<ExecutionReport> = {}): ExecutionReport => ({
    id: 'report-1',
    agentId: 'agent-1',
    orderId: 'order-1',
    status: 'requires_approval',
    output: { result: 'success', data: 'test' },
    logs: [],
    timestamp: new Date(),
    executionTimeMs: 1000,
    environment: 'staging',
    ...overrides,
  });

  const createCriteria = (overrides: Partial<QualityCriteria> = {}): QualityCriteria => ({
    minScore: 70,
    requiredFields: [],
    ...overrides,
  });

  describe('evaluateQuality', () => {
    it('should return 100 for a perfect report', () => {
      const report = createReport();
      const criteria = createCriteria();

      const result = evaluator.evaluateQuality(report, criteria);

      expect(result.score).toBe(100);
      expect(result.meetsCriteria).toBe(true);
      expect(result.feedback).toHaveLength(0);
    });

    it('should deduct points for missing required fields', () => {
      const report = createReport({ output: { data: 'test' } });
      const criteria = createCriteria({ requiredFields: ['result', 'status'] });

      const result = evaluator.evaluateQuality(report, criteria);

      expect(result.score).toBeLessThan(100);
      expect(result.missingFields).toContain('result');
      expect(result.missingFields).toContain('status');
    });

    it('should deduct points for error logs', () => {
      const report = createReport({
        logs: [
          { timestamp: new Date(), level: 'error', message: 'Test error' },
        ],
      });
      const criteria = createCriteria();

      const result = evaluator.evaluateQuality(report, criteria);

      expect(result.score).toBeLessThan(100);
      expect(result.feedback.some(f => f.includes('error'))).toBe(true);
    });

    it('should fail if score is below minimum', () => {
      const report = createReport({ output: {} });
      const criteria = createCriteria({
        minScore: 90,
        requiredFields: ['field1', 'field2', 'field3'],
      });

      const result = evaluator.evaluateQuality(report, criteria);

      expect(result.meetsCriteria).toBe(false);
      expect(result.feedback.some(f => f.includes('below minimum'))).toBe(true);
    });

    it('should pass if score meets minimum', () => {
      const report = createReport({ output: { result: 'ok' } });
      const criteria = createCriteria({
        minScore: 70,
        requiredFields: ['result'],
      });

      const result = evaluator.evaluateQuality(report, criteria);

      expect(result.meetsCriteria).toBe(true);
    });
  });
});
