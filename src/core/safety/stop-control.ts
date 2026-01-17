/**
 * Stop Control - instant stop mechanism for the system
 */

import { ExecutionSandbox } from '../agents/execution-sandbox';
import { createLogger } from '../monitoring';

export class StopControl {
  private stopped: boolean = false;
  private stopReason: string = '';
  private sandbox: ExecutionSandbox | null = null;
  private logger = createLogger();

  /**
   * Initialize stop control with sandbox reference
   */
  initialize(sandbox: ExecutionSandbox): void {
    this.sandbox = sandbox;
  }

  /**
   * Stop all executions immediately
   */
  stopAll(reason: string = 'Manual stop'): void {
    this.stopped = true;
    this.stopReason = reason;

    this.logger.warn('System stop requested', { reason });

    if (this.sandbox) {
      this.sandbox.stopAllExecutions();
      this.logger.info('All executions stopped', {
        reason,
        activeExecutions: this.sandbox.getActiveExecutions().length,
      });
    }
  }

  /**
   * Check if system is stopped
   */
  isStopped(): boolean {
    return this.stopped;
  }

  /**
   * Get stop reason
   */
  getStopReason(): string {
    return this.stopReason;
  }

  /**
   * Resume system operations
   */
  resume(): void {
    this.stopped = false;
    this.stopReason = '';
    this.logger.info('System resumed');
  }

  /**
   * Create abort signal that respects stop control
   */
  createAbortSignal(): AbortSignal {
    const controller = new AbortController();

    if (this.stopped) {
      controller.abort();
    }

    // Monitor stop state
    const checkInterval = setInterval(() => {
      if (this.stopped && !controller.signal.aborted) {
        controller.abort();
        clearInterval(checkInterval);
      }
    }, 100);

    return controller.signal;
  }
}

// Singleton instance
export const stopControl = new StopControl();