/**
 * Metrics - track system performance and quality metrics
 */

import { ExecutionReport } from '../../types';

export interface SystemMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  averageQualityScore: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  approvalRate: number;
}

export class MetricsCollector {
  private executions: ExecutionReport[] = [];
  private approvals: Map<string, boolean> = new Map(); // reportId -> approved
  private maxHistory = 1000; // Keep last 1000 executions

  /**
   * Record execution
   */
  recordExecution(report: ExecutionReport): void {
    this.executions.push(report);
    
    // Trim history if too large
    if (this.executions.length > this.maxHistory) {
      this.executions = this.executions.slice(-this.maxHistory);
    }
  }

  /**
   * Record approval decision
   */
  recordApproval(reportId: string, approved: boolean): void {
    this.approvals.set(reportId, approved);
  }

  /**
   * Get system metrics
   */
  getMetrics(): SystemMetrics {
    const recentExecutions = this.executions.slice(-100); // Last 100 for averages
    
    const successful = recentExecutions.filter(e => e.status === 'success').length;
    const failed = recentExecutions.filter(e => e.status === 'failed').length;
    
    const avgExecutionTime = recentExecutions.length > 0
      ? recentExecutions.reduce((sum, e) => sum + e.executionTimeMs, 0) / recentExecutions.length
      : 0;

    const qualityScores = recentExecutions
      .filter(e => e.qualityScore !== undefined)
      .map(e => e.qualityScore!);
    
    const avgQualityScore = qualityScores.length > 0
      ? qualityScores.reduce((sum, s) => sum + s, 0) / qualityScores.length
      : 0;

    // Count risk levels (this would need risk assessments to be stored)
    const riskDistribution = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    // Calculate approval rate
    const approvedCount = Array.from(this.approvals.values()).filter(a => a).length;
    const approvalRate = this.approvals.size > 0
      ? approvedCount / this.approvals.size
      : 0;

    return {
      totalExecutions: this.executions.length,
      successfulExecutions: successful,
      failedExecutions: failed,
      averageExecutionTime: Math.round(avgExecutionTime),
      averageQualityScore: Math.round(avgQualityScore * 100) / 100,
      riskDistribution,
      approvalRate: Math.round(approvalRate * 10000) / 100, // Percentage with 2 decimals
    };
  }

  /**
   * Get recent executions
   */
  getRecentExecutions(limit: number = 10): ExecutionReport[] {
    return this.executions.slice(-limit).reverse();
  }

  /**
   * Clear metrics history
   */
  clear(): void {
    this.executions = [];
    this.approvals.clear();
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();