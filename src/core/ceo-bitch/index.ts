/**
 * CEO Bitch - Quality Gate and Approval System
 */

import {
  AgentType,
  OwnerOrder,
  ExecutionReport,
  ApprovalDecision,
  QualityCriteria,
  RiskCheck,
} from '../../types';
import { QualityEvaluator } from './quality-evaluator';
import { RiskAssessor } from './risk-assessor';
import { ApprovalWorkflow, ApprovalResult } from './approval-workflow';

export class CEOBitch {
  private qualityEvaluator: QualityEvaluator;
  private riskAssessor: RiskAssessor;
  private approvalWorkflow: ApprovalWorkflow;

  constructor() {
    this.qualityEvaluator = new QualityEvaluator();
    this.riskAssessor = new RiskAssessor();
    this.approvalWorkflow = new ApprovalWorkflow();
  }

  /**
   * Review execution report and make approval decision
   */
  async reviewReport(
    report: ExecutionReport,
    qualityCriteria: QualityCriteria,
    riskChecks: RiskCheck[],
    humanDecision?: ApprovalDecision
  ): Promise<ApprovalResult> {
    return this.approvalWorkflow.processApproval(
      report,
      qualityCriteria,
      riskChecks,
      humanDecision
    );
  }

  /**
   * Select an agent type based on the order description
   */
  selectAgentTypeForOrder(order: OwnerOrder): AgentType {
    const description = order.description.toLowerCase();

    // Simple heuristic routing until AI-based routing is implemented
    if (/(deploy|release|run|execute|ops|operation)/.test(description)) {
      return 'execution';
    }
    if (/(research|investigate|find|lookup)/.test(description)) {
      return 'research';
    }
    if (/(analy|insight|report|metrics)/.test(description)) {
      return 'analysis';
    }
    if (/(message|email|write|draft|communicat)/.test(description)) {
      return 'communication';
    }

    return 'code';
  }

  /**
   * Human override for approval decision
   */
  async humanApproval(
    _reportId: string,
    _decision: ApprovalDecision,
    _feedback?: string
  ): Promise<ApprovalResult | null> {
    // This would need to fetch the report and its criteria
    // For now, return null - this should be implemented with proper data access
    return null;
  }

  /**
   * Get quality evaluator (for testing/debugging)
   */
  getQualityEvaluator(): QualityEvaluator {
    return this.qualityEvaluator;
  }

  /**
   * Get risk assessor (for testing/debugging)
   */
  getRiskAssessor(): RiskAssessor {
    return this.riskAssessor;
  }

  /**
   * Get approval workflow (for testing/debugging)
   */
  getApprovalWorkflow(): ApprovalWorkflow {
    return this.approvalWorkflow;
  }

  /**
   * Evaluate quality of a report
   */
  evaluateQuality(report: ExecutionReport, qualityCriteria: QualityCriteria): number {
    return this.qualityEvaluator.evaluateQuality(report, qualityCriteria).score;
  }

  /**
   * Assess risk of a report
   */
  assessRisk(report: ExecutionReport, riskChecks: RiskCheck[]) {
    return this.riskAssessor.assessRisk(report, riskChecks);
  }
}