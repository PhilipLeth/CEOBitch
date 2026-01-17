/**
 * Runaway Detection - monitors for unwanted AI behavior
 */

import { ExecutionReport, ExecutionLog } from '../../types';

export interface RunawaySignal {
  detected: boolean;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class RunawayDetector {
  /**
   * Detect runaway behavior in execution report
   */
  detectRunaway(report: ExecutionReport): RunawaySignal {
    // Check for excessive execution time
    if (report.executionTimeMs > 600000) { // 10 minutes
      return {
        detected: true,
        reason: 'Excessive execution time',
        severity: 'high',
      };
    }

    // Check for excessive log volume (indicates potential loops)
    if (report.logs.length > 1000) {
      return {
        detected: true,
        reason: 'Excessive log volume (possible infinite loop)',
        severity: 'critical',
      };
    }

    // Check for rapid error repetition
    const recentErrors = report.logs
      .filter(log => log.level === 'error')
      .slice(-10);
    
    if (recentErrors.length >= 10) {
      const timeSpan = recentErrors[recentErrors.length - 1].timestamp.getTime() -
                       recentErrors[0].timestamp.getTime();
      
      if (timeSpan < 1000) { // 10 errors in less than 1 second
        return {
          detected: true,
          reason: 'Rapid error repetition detected',
          severity: 'critical',
        };
      }
    }

    // Check for suspicious patterns in logs
    const suspiciousPatterns = this.checkSuspiciousPatterns(report.logs);
    if (suspiciousPatterns.length > 0) {
      return {
        detected: true,
        reason: `Suspicious patterns: ${suspiciousPatterns.join(', ')}`,
        severity: 'medium',
      };
    }

    // Check output size (very large outputs might indicate runaway)
    const outputSize = JSON.stringify(report.output).length;
    if (outputSize > 10000000) { // 10MB
      return {
        detected: true,
        reason: 'Excessively large output',
        severity: 'high',
      };
    }

    return {
      detected: false,
      reason: '',
      severity: 'low',
    };
  }

  /**
   * Check for suspicious patterns in logs
   */
  private checkSuspiciousPatterns(logs: ExecutionLog[]): string[] {
    const patterns: string[] = [];
    const logMessages = logs.map(log => log.message.toLowerCase());

    // Check for infinite loop indicators
    const repeatedMessages = new Map<string, number>();
    for (const msg of logMessages) {
      repeatedMessages.set(msg, (repeatedMessages.get(msg) || 0) + 1);
    }

    for (const [msg, count] of repeatedMessages.entries()) {
      if (count > 50 && msg.length > 0) {
        patterns.push('repeated_message_pattern');
        break;
      }
    }

    // Check for resource exhaustion keywords
    const resourceKeywords = ['memory', 'cpu', 'timeout', 'limit', 'exceeded'];
    for (const keyword of resourceKeywords) {
      if (logMessages.some(msg => msg.includes(keyword))) {
        patterns.push(`resource_${keyword}`);
      }
    }

    return patterns;
  }
}