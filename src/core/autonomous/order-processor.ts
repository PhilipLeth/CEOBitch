/**
 * Order Processor - pulls due orders and executes them autonomously.
 */

import { AutonomousOrderFlow } from '../../workflows/autonomous-order-flow';
import { OrderStore } from '../storage/order-store';
import { OwnerOrder } from '../../types';
import { createLogger } from '../monitoring';

type OrderProcessorOptions = {
  pollIntervalMs: number;
  leaseMs: number;
  retryBaseMs: number;
  retryMaxMs: number;
};

const defaultOptions: OrderProcessorOptions = {
  pollIntervalMs: 250,
  leaseMs: 30000,
  retryBaseMs: 1500,
  retryMaxMs: 30000,
};

export class OrderProcessor {
  private timer?: NodeJS.Timeout;
  private isProcessing = false;
  private workerId = `order-worker-${process.pid}-${Math.random().toString(16).slice(2, 8)}`;
  private logger = createLogger();

  constructor(
    private store: OrderStore,
    private autonomousOrderFlow: AutonomousOrderFlow,
    private options: OrderProcessorOptions = defaultOptions
  ) {}

  async init(): Promise<void> {
    await this.store.init();
    this.logger.info('Order processor initialized', {
      workerId: this.workerId,
      pollIntervalMs: this.options.pollIntervalMs,
    });
  }

  start(): void {
    this.logger.info('Order processor started', { workerId: this.workerId });
    void this.tick();
    this.timer = setInterval(() => void this.tick(), this.options.pollIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
      this.logger.info('Order processor stopped', { workerId: this.workerId });
    }
  }

  private async tick(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    try {
      const now = Date.now();
      const dueOrders = await this.store.getDueOrders(now);

      for (const order of dueOrders) {
        const leased = await this.store.acquireLease(
          order.id,
          this.workerId,
          this.options.leaseMs,
          now
        );

        if (!leased) {
          continue;
        }

        await this.processOrder(leased);
      }
    } catch (error) {
      this.logger.error('Order processor tick failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.isProcessing = false;
    }
  }

  private async processOrder(order: OwnerOrder): Promise<void> {
    const attemptCount = order.attemptCount + 1;
    const startedOrder: OwnerOrder = {
      ...order,
      attemptCount,
      lastError: undefined,
      updatedAt: new Date(),
    };

    await this.store.updateOrder(startedOrder);
    this.logger.info('Processing order', { orderId: order.id, attemptCount });

    try {
      const result = await this.autonomousOrderFlow.executeOrder(startedOrder);

      const completedOrder: OwnerOrder = {
        ...startedOrder,
        status: 'completed',
        lockedBy: undefined,
        lockedUntil: undefined,
        nextAttemptAt: undefined,
        updatedAt: new Date(),
      };

      await this.store.updateOrder(completedOrder);
      await this.store.setReport(order.id, {
        approved: result.approved,
        report: result.report,
        gitCommit: result.gitCommit,
        deployed: result.deployed,
      });

      this.logger.info('Order completed', {
        orderId: order.id,
        approved: result.approved,
        deployed: result.deployed,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const now = Date.now();
      const backoffMs = Math.min(
        this.options.retryBaseMs * Math.pow(2, Math.max(0, attemptCount - 1)),
        this.options.retryMaxMs
      );

      // Retry later with exponential backoff.
      const failedOrder: OwnerOrder = {
        ...startedOrder,
        status: 'failed',
        lastError: message,
        nextAttemptAt: now + backoffMs,
        lockedBy: undefined,
        lockedUntil: undefined,
        updatedAt: new Date(),
      };

      await this.store.updateOrder(failedOrder);
      this.logger.warn('Order failed, scheduled retry', {
        orderId: order.id,
        attemptCount,
        backoffMs,
        error: message,
      });
    }
  }
}
