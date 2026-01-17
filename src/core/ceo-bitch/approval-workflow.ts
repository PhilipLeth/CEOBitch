/**
 * Approval Workflow - manages approval process for execution reports
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ExecutionReport,
  ApprovalRecord,
  ApprovalDecision,
  QualityCriteria,
  RiskCheck,
} from '../../types';
import { QualityEvaluator, QualityEvaluation } from './quality-evaluator';
import { RiskAssessor } from './risk-assessor';
import type { RiskAssessment } from './risk-assessor';
import { config } from '../../config';

export interface ApprovalResult {
  decision: ApprovalDecision;
  approvalRecord: ApprovalRecord;
  qualityEvaluation: QualityEvaluation;
  riskAssessment: RiskAssessment;
}

export class ApprovalWorkflow {
  private qualityEvaluator: QualityEvaluator;
  private riskAssessor: RiskAssessor;
  private approvals: Map<string, ApprovalRecord> = new Map();

  constructor() {
    this.qualityEvaluator = new QualityEvaluator();
    this.riskAssessor = new RiskAssessor();
  }

  /**
   * Process approval request
   */
  async processApproval(
    report: ExecutionReport,
    qualityCriteria: QualityCriteria,
    riskChecks: RiskCheck[],
    humanDecision?: ApprovalDecision
  ): Promise<ApprovalResult> {
    // Evaluate quality
    const qualityEvaluation = this.qualityEvaluator.evaluateQuality(report, qualityCriteria);

    // Assess risk
    const riskAssessment = this.riskAssessor.assessRisk(report, riskChecks);

    // Make decision
    let decision: ApprovalDecision;

    if (humanDecision) {
      // Human override
      decision = humanDecision;
    } else if (config.qualityStandards.autoApproveLowRisk && riskAssessment.overallRisk === 'low' && qualityEvaluation.meetsCriteria) {
      // Auto-approve low risk, high quality
      decision = 'approved';
    } else if (!qualityEvaluation.meetsCriteria) {
      // Quality doesn't meet criteria
      decision = 'requires_improvement';
    } else if (riskAssessment.requiresHumanReview || riskAssessment.overallRisk === 'critical' || riskAssessment.overallRisk === 'high') {
      // Requires human review
      decision = 'requires_improvement';
    } else if (qualityEvaluation.meetsCriteria && riskAssessment.overallRisk === 'low') {
      // Auto-approve
      decision = 'approved';
    } else {
      // Default to requiring improvement
      decision = 'requires_improvement';
    }

    // Create approval record
    const approvalRecord: ApprovalRecord = {
      id: uuidv4(),
      reportId: report.id,
      decision,
      decisionBy: humanDecision ? 'human' : 'automated',
      timestamp: new Date(),
      feedback: this.generateFeedback(qualityEvaluation, riskAssessment),
      improvementRequirements: decision === 'requires_improvement'
        ? this.generateImprovementRequirements(qualityEvaluation, riskAssessment)
        : undefined,
    };

    // Store approval
    this.approvals.set(approvalRecord.id, approvalRecord);

    return {
      decision,
      approvalRecord,
      qualityEvaluation,
      riskAssessment,
    };
  }

  /**
   * Get approval record
   */
  getApproval(approvalId: string): ApprovalRecord | undefined {
    return this.approvals.get(approvalId);
  }

  /**
   * Get approval by report ID
   */
  getApprovalByReportId(reportId: string): ApprovalRecord | undefined {
    for (const approval of this.approvals.values()) {
      if (approval.reportId === reportId) {
        return approval;
      }
    }
    return undefined;
  }

  /**
   * Generate feedback message
   */
  private generateFeedback(
    qualityEvaluation: QualityEvaluation,
    riskAssessment: RiskAssessment
  ): string {
    const parts: string[] = [];

    if (qualityEvaluation.meetsCriteria) {
      parts.push(`Quality score: ${qualityEvaluation.score}/100 (meets criteria)`);
    } else {
      parts.push(`Quality score: ${qualityEvaluation.score}/100 (below threshold)`);
      if (qualityEvaluation.feedback.length > 0) {
        parts.push(`Issues: ${qualityEvaluation.feedback.join('; ')}`);
      }
    }

    parts.push(`Risk level: ${riskAssessment.overallRisk}`);

    if (riskAssessment.recommendations && riskAssessment.recommendations.length > 0) {
      parts.push(`Recommendations: ${riskAssessment.recommendations.join('; ')}`);
    }

    return parts.join('. ');
  }

  /**
   * Generate improvement requirements
   */
  private generateImprovementRequirements(
    qualityEvaluation: QualityEvaluation,
    riskAssessment: RiskAssessment
  ): string[] {
    const requirements: string[] = [];

    // Quality requirements
    if (!qualityEvaluation.meetsCriteria) {
      if (qualityEvaluation.missingFields.length > 0) {
        requirements.push(`Add missing required fields: ${qualityEvaluation.missingFields.join(', ')}`);
      }
      
      if (qualityEvaluation.feedback.length > 0) {
        requirements.push(...qualityEvaluation.feedback);
      }
    }

    // Risk requirements
    if (riskAssessment.overallRisk === 'high' || riskAssessment.overallRisk === 'critical') {
      requirements.push(`Address high-risk issues: ${riskAssessment.riskFactors.map(f => f.description).join(', ')}`);
    }

    if (riskAssessment.recommendations && riskAssessment.recommendations.length > 0) {
      requirements.push(...riskAssessment.recommendations);
    }

    return requirements;
  }
}