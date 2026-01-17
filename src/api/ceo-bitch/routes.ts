/**
 * CEO Bitch API Routes - Quality Gate interface
 */

import { Router, Request, Response } from 'express';
import { ExecutionReport, QualityCriteria, RiskCheck } from '../../types';
import { CEOBitch } from '../../core/ceo-bitch';
import { createLogger } from '../../core/monitoring';

export function createCEOBitchRoutes(ceoBitch: CEOBitch): Router {
  const router = Router();
  const logger = createLogger();

  /**
   * Evaluate quality of an execution report
   * POST /api/ceo-bitch/evaluate
   */
  router.post('/evaluate', async (req: Request, res: Response) => {
    try {
      const { report, qualityCriteria } = req.body as {
        report: ExecutionReport;
        qualityCriteria: QualityCriteria;
      };

      if (!report || !qualityCriteria) {
        return res.status(400).json({ error: 'Report and qualityCriteria are required' });
      }

      const score = ceoBitch.evaluateQuality(report, qualityCriteria);

      logger.info('Quality evaluation completed', {
        reportId: report.id,
        score,
      });

      return res.json({ score, passed: score >= qualityCriteria.minScore });
    } catch (error) {
      logger.error('Error evaluating quality', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        error: 'Failed to evaluate quality',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * Assess risk of an execution report
   * POST /api/ceo-bitch/assess-risk
   */
  router.post('/assess-risk', async (req: Request, res: Response) => {
    try {
      const { report, riskChecks } = req.body as {
        report: ExecutionReport;
        riskChecks: RiskCheck[];
      };

      if (!report || !riskChecks) {
        return res.status(400).json({ error: 'Report and riskChecks are required' });
      }

      const assessment = ceoBitch.assessRisk(report, riskChecks);

      logger.info('Risk assessment completed', {
        reportId: report.id,
        overallRisk: assessment.overallRisk,
      });

      return res.json(assessment);
    } catch (error) {
      logger.error('Error assessing risk', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        error: 'Failed to assess risk',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * Full review of an execution report
   * POST /api/ceo-bitch/review
   */
  router.post('/review', async (req: Request, res: Response) => {
    try {
      const { report, qualityCriteria, riskChecks } = req.body as {
        report: ExecutionReport;
        qualityCriteria: QualityCriteria;
        riskChecks: RiskCheck[];
      };

      if (!report || !qualityCriteria || !riskChecks) {
        return res.status(400).json({
          error: 'Report, qualityCriteria, and riskChecks are required',
        });
      }

      const result = await ceoBitch.reviewReport(report, qualityCriteria, riskChecks);

      logger.info('Report review completed', {
        reportId: report.id,
        decision: result.decision,
      });

      return res.json(result);
    } catch (error) {
      logger.error('Error reviewing report', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        error: 'Failed to review report',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * Get quality standards
   * GET /api/ceo-bitch/standards
   */
  router.get('/standards', (_req: Request, res: Response) => {
    res.json({
      defaultMinScore: 70,
      requiredFields: ['result', 'status'],
      riskThresholds: {
        low: 0.3,
        medium: 0.6,
        high: 0.8,
        critical: 1.0,
      },
    });
  });

  return router;
}
