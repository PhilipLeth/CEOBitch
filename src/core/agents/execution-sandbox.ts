/**
 * Execution Sandbox - isolated test/staging environment for agent execution
 */

import { ExecutionContext, ResourceLimits } from '../../types';

interface SandboxMetrics {
  memoryUsageMB: number;
  cpuUsagePercent: number;
  networkCalls: number;
  fileOperations: number;
  executionTimeMs: number;
}

export class ExecutionSandbox {
  private activeExecutions: Map<string, {
    context: ExecutionContext;
    startTime: Date;
    metrics: SandboxMetrics;
    stopped: boolean;
  }> = new Map();

  /**
   * Execute agent work in sandboxed environment
   */
  async execute<T>(
    executionId: string,
    context: ExecutionContext,
    work: () => Promise<T>,
    limits?: ResourceLimits
  ): Promise<T> {
    const startTime = new Date();
    const metrics: SandboxMetrics = {
      memoryUsageMB: 0,
      cpuUsagePercent: 0,
      networkCalls: 0,
      fileOperations: 0,
      executionTimeMs: 0,
    };

    // Register execution
    this.activeExecutions.set(executionId, {
      context,
      startTime,
      metrics,
      stopped: false,
    });

    try {
      // Setup abort signal handler
      const abortController = new AbortController();
      if (context.stopSignal) {
        context.stopSignal.addEventListener('abort', () => {
          abortController.abort();
          this.stopExecution(executionId);
        });
      }

      // Monitor resource usage (simplified - in production use actual monitoring)
      const monitorInterval = this.startMonitoring(executionId, limits, metrics);

      // Execute work with timeout
      const timeout = 300000; // 5 minutes default
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          abortController.abort();
          reject(new Error(`Execution timeout after ${timeout}ms`));
        }, timeout * 1000);
      });

      try {
        const result = await Promise.race([
          work(),
          timeoutPromise,
        ]);

        clearInterval(monitorInterval);
        metrics.executionTimeMs = Date.now() - startTime.getTime();
        
        this.activeExecutions.delete(executionId);
        return result;
      } catch (error) {
        clearInterval(monitorInterval);
        throw error;
      }
    } catch (error) {
      this.activeExecutions.delete(executionId);
      throw error;
    }
  }

  /**
   * Stop an execution immediately
   */
  stopExecution(executionId: string): boolean {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return false;
    }

    execution.stopped = true;
    this.activeExecutions.delete(executionId);
    
    execution.context.logger.warn('Execution stopped by sandbox', {
      executionId,
      executionTimeMs: Date.now() - execution.startTime.getTime(),
    });

    return true;
  }

  /**
   * Check if execution is still running
   */
  isExecutionActive(executionId: string): boolean {
    return this.activeExecutions.has(executionId);
  }

  /**
   * Get execution metrics
   */
  getExecutionMetrics(executionId: string): SandboxMetrics | null {
    const execution = this.activeExecutions.get(executionId);
    return execution ? execution.metrics : null;
  }

  /**
   * Stop all active executions
   */
  stopAllExecutions(): void {
    const executionIds = Array.from(this.activeExecutions.keys());
    executionIds.forEach(id => this.stopExecution(id));
  }

  /**
   * Start monitoring resource usage
   */
  private startMonitoring(
    executionId: string,
    limits: ResourceLimits | undefined,
    metrics: SandboxMetrics
  ): NodeJS.Timeout {
    return setInterval(() => {
      const execution = this.activeExecutions.get(executionId);
      if (!execution) {
        return;
      }

      // Check limits (simplified - in production use actual system metrics)
      if (limits) {
        if (limits.maxMemoryMB && metrics.memoryUsageMB > limits.maxMemoryMB) {
          execution.context.logger.error('Memory limit exceeded', {
            executionId,
            limit: limits.maxMemoryMB,
            usage: metrics.memoryUsageMB,
          });
          this.stopExecution(executionId);
          throw new Error(`Memory limit exceeded: ${metrics.memoryUsageMB}MB > ${limits.maxMemoryMB}MB`);
        }

        if (limits.maxCpuPercent && metrics.cpuUsagePercent > limits.maxCpuPercent) {
          execution.context.logger.warn('CPU usage high', {
            executionId,
            limit: limits.maxCpuPercent,
            usage: metrics.cpuUsagePercent,
          });
        }

        if (limits.maxNetworkCalls && metrics.networkCalls > limits.maxNetworkCalls) {
          execution.context.logger.error('Network call limit exceeded', {
            executionId,
            limit: limits.maxNetworkCalls,
            calls: metrics.networkCalls,
          });
          this.stopExecution(executionId);
          throw new Error(`Network call limit exceeded: ${metrics.networkCalls} > ${limits.maxNetworkCalls}`);
        }

        if (limits.maxFileOperations && metrics.fileOperations > limits.maxFileOperations) {
          execution.context.logger.error('File operation limit exceeded', {
            executionId,
            limit: limits.maxFileOperations,
            operations: metrics.fileOperations,
          });
          this.stopExecution(executionId);
          throw new Error(`File operation limit exceeded: ${metrics.fileOperations} > ${limits.maxFileOperations}`);
        }
      }
    }, 1000); // Check every second
  }

  /**
   * Track resource usage (to be called by capabilities)
   */
  trackResourceUsage(executionId: string, type: keyof SandboxMetrics, value: number): void {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      execution.metrics[type] = (execution.metrics[type] as number) + value;
    }
  }

  /**
   * Get all active executions
   */
  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }
}