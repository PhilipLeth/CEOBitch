/**
 * Quality Gate Flow - CEO Bitch review workflow
 * Report Received → Quality Evaluation → Risk Assessment →
 * Decision (Approve/Reject/Improve) → Feedback Loop
 */

import { ExecutionReport, QualityCriteria, RiskCheck, ApprovalRecord, RiskAssessment } from '../types';
import { CEOBitch } from '../core/ceo-bitch';
import { createLogger } from '../core/monitoring';

export interface QualityGateResult {
  reportId: string;
  qualityScore: number;
  riskAssessment: RiskAssessment;
  decision: 'approved' | 'rejected' | 'requires_improvement';
  approvalRecord: ApprovalRecord;
  feedback?: string;
}

export class QualityGateFlow {
  private logger = createLogger();

  constructor(private ceoBitch: CEOBitch) {}

  /**
   * Run the complete quality gate flow
   */
  async runQualityGate(
    report: ExecutionReport,
    qualityCriteria: QualityCriteria,
    riskChecks: RiskCheck[]
  ): Promise<QualityGateResult> {
    this.logger.info('Starting quality gate flow', { reportId: report.id });

    // Step 1: Quality Evaluation
    const qualityScore = this.ceoBitch.evaluateQuality(report, qualityCriteria);
    this.logger.info('Quality evaluation complete', {
      reportId: report.id,
      qualityScore,
    });

    // Step 2: Risk Assessment
    const riskAssessment = this.ceoBitch.assessRisk(report, riskChecks);
    this.logger.info('Risk assessment complete', {
      reportId: report.id,
      overallRisk: riskAssessment.overallRisk,
    });

    // Step 3: Make Decision
    const reviewResult = await this.ceoBitch.reviewReport(report, qualityCriteria, riskChecks);

    this.logger.info('Quality gate decision made', {
      reportId: report.id,
      decision: reviewResult.decision,
    });

    // Step 4: Generate feedback if needed
    let feedback: string | undefined;
    if (reviewResult.decision === 'rejected' || reviewResult.decision === 'requires_improvement') {
      feedback = this.generateFeedback(qualityScore, qualityCriteria, riskAssessment);
    }

    return {
      reportId: report.id,
      qualityScore,
      riskAssessment,
      decision: reviewResult.decision,
      approvalRecord: reviewResult.approvalRecord,
      feedback,
    };
  }

  /**
   * Generate improvement feedback
   */
  private generateFeedback(
    qualityScore: number,
    qualityCriteria: QualityCriteria,
    riskAssessment: RiskAssessment
  ): string {
    const issues: string[] = [];

    if (qualityScore < qualityCriteria.minScore) {
      issues.push(`Quality score (${qualityScore}) is below minimum (${qualityCriteria.minScore})`);
    }

    if (riskAssessment.overallRisk === 'high' || riskAssessment.overallRisk === 'critical') {
      issues.push(`Risk level is ${riskAssessment.overallRisk}`);
      for (const factor of riskAssessment.riskFactors) {
        issues.push(`  - ${factor.type}: ${factor.description}`);
      }
    }

    if (riskAssessment.recommendations) {
      issues.push('Recommendations:');
      for (const rec of riskAssessment.recommendations) {
        issues.push(`  - ${rec}`);
      }
    }

    return issues.join('\n');
  }

  /**
   * Handle feedback loop - re-evaluate after improvements
   */
  async handleFeedbackLoop(
    originalReport: ExecutionReport,
    improvedReport: ExecutionReport,
    qualityCriteria: QualityCriteria,
    riskChecks: RiskCheck[]
  ): Promise<QualityGateResult> {
    this.logger.info('Running feedback loop', {
      originalReportId: originalReport.id,
      improvedReportId: improvedReport.id,
    });

    return this.runQualityGate(improvedReport, qualityCriteria, riskChecks);
  }
}
