/**
 * Risk Assessor - identifies and evaluates risks
 */

import { ExecutionReport, RiskFactor, RiskCheck } from '../../types';

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  recommendations?: string[];
  requiresHumanReview: boolean;
}
import { config } from '../../config';

export class RiskAssessor {
  /**
   * Assess risks in execution report
   */
  assessRisk(report: ExecutionReport, riskChecks: RiskCheck[]): RiskAssessment {
    const riskFactors: RiskFactor[] = [];

    // Run all risk checks
    for (const check of riskChecks) {
      const factor = this.runRiskCheck(report, check);
      if (factor) {
        riskFactors.push(factor);
      }
    }

    // Determine overall risk level
    const overallRisk = this.calculateOverallRisk(riskFactors);

    // Generate recommendations
    const recommendations = this.generateRecommendations(riskFactors, overallRisk);

    // Determine if human review is required
    const requiresHumanReview =
      overallRisk === 'high' || overallRisk === 'critical' || riskFactors.some(f => f.severity === 'critical');

    return {
      overallRisk,
      riskFactors,
      recommendations,
      requiresHumanReview,
    };
  }

  /**
   * Run a single risk check
   */
  private runRiskCheck(report: ExecutionReport, check: RiskCheck): RiskFactor | null {
    let detected = false;
    let severity: RiskFactor['severity'] = 'low';
    const evidence: unknown = null;

    switch (check.checkType) {
      case 'pattern':
        detected = this.checkPattern(report, check);
        break;
      case 'heuristic':
        detected = this.checkHeuristic(report, check);
        break;
      case 'ai-assessment':
        // AI assessment would be implemented here
        detected = false;
        break;
      case 'custom':
        detected = this.checkCustom(report, check);
        break;
    }

    if (detected) {
      // Determine severity based on threshold
      const riskValue = this.calculateRiskValue(report, check);
      
      if (riskValue >= check.threshold) {
        severity = this.getSeverityFromValue(riskValue);
        
        return {
          type: check.name,
          severity,
          description: check.description,
          evidence,
        };
      }
    }

    return null;
  }

  /**
   * Check pattern-based risks
   */
  private checkPattern(report: ExecutionReport, check: RiskCheck): boolean {
    // Simple pattern matching - in production use regex or more sophisticated patterns
    const outputStr = JSON.stringify(report.output).toLowerCase();
    const checkNameLower = check.name.toLowerCase();

    // Check for common risk patterns
    if (checkNameLower.includes('error') || checkNameLower.includes('exception')) {
      return report.logs.some(log => log.level === 'error');
    }

    if (checkNameLower.includes('timeout')) {
      return report.executionTimeMs > (report.agentId ? 300000 : 60000); // 5 min default
    }

    if (checkNameLower.includes('sensitive')) {
      const sensitivePatterns = ['password', 'api_key', 'secret', 'token', 'credential'];
      return sensitivePatterns.some(pattern => outputStr.includes(pattern));
    }

    return false;
  }

  /**
   * Check heuristic-based risks
   */
  private checkHeuristic(report: ExecutionReport, check: RiskCheck): boolean {
    // Heuristic checks based on execution characteristics
    const checkNameLower = check.name.toLowerCase();

    if (checkNameLower.includes('long_execution')) {
      return report.executionTimeMs > 60000; // More than 1 minute
    }

    if (checkNameLower.includes('many_errors')) {
      const errorCount = report.logs.filter(log => log.level === 'error').length;
      return errorCount > 3;
    }

    if (checkNameLower.includes('unexpected_output')) {
      return report.output === null || report.output === undefined;
    }

    return false;
  }

  /**
   * Check custom risk patterns
   */
  private checkCustom(_report: ExecutionReport, _check: RiskCheck): boolean {
    // Custom checks would be implemented based on specific requirements
    return false;
  }

  /**
   * Calculate risk value for a check
   */
  private calculateRiskValue(report: ExecutionReport, _check: RiskCheck): number {
    // Calculate a risk value between 0 and 1
    let value = 0;

    if (report.logs.some(log => log.level === 'error')) {
      value += 0.3;
    }

    if (report.executionTimeMs > 300000) {
      value += 0.2;
    }

    if (report.output === null || report.output === undefined) {
      value += 0.4;
    }

    // Check output size (very large outputs might be risky)
    const outputSize = JSON.stringify(report.output).length;
    if (outputSize > 1000000) {
      value += 0.1;
    }

    return Math.min(1, value);
  }

  /**
   * Get severity from risk value
   */
  private getSeverityFromValue(value: number): RiskFactor['severity'] {
    if (value >= config.riskThresholds.critical) {
      return 'critical';
    } else if (value >= config.riskThresholds.high) {
      return 'high';
    } else if (value >= config.riskThresholds.medium) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Calculate overall risk from factors
   */
  private calculateOverallRisk(factors: RiskFactor[]): RiskAssessment['overallRisk'] {
    if (factors.length === 0) {
      return 'low';
    }

    const hasCritical = factors.some(f => f.severity === 'critical');
    if (hasCritical) {
      return 'critical';
    }

    const hasHigh = factors.some(f => f.severity === 'high');
    if (hasHigh) {
      return 'high';
    }

    const hasMedium = factors.some(f => f.severity === 'medium');
    if (hasMedium) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Generate recommendations based on risks
   */
  private generateRecommendations(
    factors: RiskFactor[],
    overallRisk: RiskAssessment['overallRisk']
  ): string[] {
    const recommendations: string[] = [];

    if (overallRisk === 'critical' || overallRisk === 'high') {
      recommendations.push('Requires manual review before deployment');
      recommendations.push('Consider running additional tests');
    }

    const errorFactors = factors.filter(f => f.type.includes('error'));
    if (errorFactors.length > 0) {
      recommendations.push('Review and fix errors before proceeding');
    }

    const timeoutFactors = factors.filter(f => f.type.includes('timeout'));
    if (timeoutFactors.length > 0) {
      recommendations.push('Optimize execution time or increase timeout limits');
    }

    const sensitiveFactors = factors.filter(f => f.type.includes('sensitive'));
    if (sensitiveFactors.length > 0) {
      recommendations.push('Review output for sensitive information leakage');
    }

    return recommendations;
  }
}