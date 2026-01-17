/**
 * Quality Evaluator - assesses output quality against criteria
 */

import { ExecutionReport, QualityCriteria } from '../../types';

export interface QualityEvaluation {
  score: number; // 0-100
  meetsCriteria: boolean;
  feedback: string[];
  missingFields: string[];
}

export class QualityEvaluator {
  /**
   * Evaluate report quality against criteria
   */
  evaluateQuality(report: ExecutionReport, criteria: QualityCriteria): QualityEvaluation {
    const feedback: string[] = [];
    const missingFields: string[] = [];
    let score = 100;

    // Check required fields
    if (criteria.requiredFields) {
      const reportFields = this.extractFields(report.output);
      
      for (const field of criteria.requiredFields) {
        if (!reportFields.includes(field)) {
          missingFields.push(field);
          score -= 10; // Deduct 10 points per missing field
          feedback.push(`Missing required field: ${field}`);
        }
      }
    }

    // Check format requirements
    if (criteria.formatRequirements) {
      const formatErrors = this.checkFormat(report.output, criteria.formatRequirements);
      if (formatErrors.length > 0) {
        score -= formatErrors.length * 5;
        feedback.push(...formatErrors);
      }
    }

    // Check content requirements
    if (criteria.contentRequirements) {
      const contentErrors = this.checkContent(report.output, criteria.contentRequirements);
      if (contentErrors.length > 0) {
        score -= contentErrors.length * 5;
        feedback.push(...contentErrors);
      }
    }

    // Check execution logs for errors
    const errorLogs = report.logs.filter(log => log.level === 'error');
    if (errorLogs.length > 0) {
      score -= errorLogs.length * 15;
      feedback.push(`Execution had ${errorLogs.length} error(s)`);
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    // Check if meets minimum score
    const meetsCriteria = score >= criteria.minScore;

    if (!meetsCriteria) {
      feedback.push(`Quality score ${score} is below minimum ${criteria.minScore}`);
    }

    return {
      score,
      meetsCriteria,
      feedback,
      missingFields,
    };
  }

  /**
   * Extract field names from output object
   */
  private extractFields(output: unknown): string[] {
    if (typeof output !== 'object' || output === null) {
      return [];
    }

    if (Array.isArray(output)) {
      // For arrays, check first element
      return output.length > 0 ? this.extractFields(output[0]) : [];
    }

    return Object.keys(output as Record<string, unknown>);
  }

  /**
   * Check format requirements
   */
  private checkFormat(output: unknown, requirements: Record<string, unknown>): string[] {
    const errors: string[] = [];

    // Simplified format checking - in production use proper schema validation
    if (typeof output !== 'object' || output === null) {
      errors.push('Output must be an object');
      return errors;
    }

    const outputObj = output as Record<string, unknown>;

    for (const [key, requirement] of Object.entries(requirements)) {
      if (!(key in outputObj)) {
        errors.push(`Format requirement not met: missing field ${key}`);
        continue;
      }

      const value = outputObj[key];
      
      // Type checking
      if (typeof requirement === 'string') {
        const expectedType = requirement;
        if (expectedType === 'string' && typeof value !== 'string') {
          errors.push(`Format requirement not met: ${key} must be ${expectedType}`);
        } else if (expectedType === 'number' && typeof value !== 'number') {
          errors.push(`Format requirement not met: ${key} must be ${expectedType}`);
        } else if (expectedType === 'boolean' && typeof value !== 'boolean') {
          errors.push(`Format requirement not met: ${key} must be ${expectedType}`);
        } else if (expectedType === 'object' && (typeof value !== 'object' || value === null || Array.isArray(value))) {
          errors.push(`Format requirement not met: ${key} must be ${expectedType}`);
        } else if (expectedType === 'array' && !Array.isArray(value)) {
          errors.push(`Format requirement not met: ${key} must be ${expectedType}`);
        }
      }
    }

    return errors;
  }

  /**
   * Check content requirements
   */
  private checkContent(output: unknown, requirements: string[]): string[] {
    const errors: string[] = [];

    // Simple content checking - look for keywords in stringified output
    const outputStr = JSON.stringify(output).toLowerCase();

    for (const requirement of requirements) {
      if (!outputStr.includes(requirement.toLowerCase())) {
        errors.push(`Content requirement not met: missing "${requirement}"`);
      }
    }

    return errors;
  }
}