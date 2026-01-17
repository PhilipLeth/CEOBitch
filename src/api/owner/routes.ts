/**
 * Owner API Routes - interface for the Owner (human)
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { OwnerOrder, ApprovalDecision } from '../../types';
import { OrderFlow } from '../../workflows/order-flow';
import { AutonomousOrderFlow } from '../../workflows/autonomous-order-flow';
import { createLogger } from '../../core/monitoring';
import { metricsCollector } from '../../core/monitoring';
import { CEOBitch } from '../../core/ceo-bitch';
import { OrderStore } from '../../core/storage/order-store';

export function createOwnerRoutes(
  _orderFlow: OrderFlow,
  _autonomousOrderFlow: AutonomousOrderFlow,
  ceoBitch: CEOBitch
): Router {
  const router = Router();
  const logger = createLogger();
  void _orderFlow;
  void _autonomousOrderFlow;
  
  const store = new OrderStore();
  const storeReady = store.init().catch(error => {
    logger.error('Failed to initialize order store', {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  /**
   * Submit an order
   * POST /api/owner/orders
   */
  router.post('/orders', async (req: Request, res: Response) => {
    try {
      await storeReady;
      const { description } = req.body;

      if (!description || typeof description !== 'string') {
        return res.status(400).json({ error: 'Description is required' });
      }

      const order: OwnerOrder = {
        id: uuidv4(),
        description,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        attemptCount: 0,
        nextAttemptAt: Date.now(),
      };

      await store.createOrder(order);

      logger.info(`Order submitted by owner`, {
        orderId: order.id,
        autonomous: true,
      });

      return res.json({
        orderId: order.id,
        status: 'submitted',
        autonomous: true,
        message: 'Order submitted and will be processed by Ralph worker',
      });
    } catch (error) {
      logger.error('Error submitting order', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        error: 'Failed to submit order',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * Submit autonomous order (Ralph + Amp)
   * POST /api/owner/orders/autonomous
   */
  router.post('/orders/autonomous', async (req: Request, res: Response) => {
    try {
      await storeReady;
      const { description } = req.body;

      if (!description || typeof description !== 'string') {
        return res.status(400).json({ error: 'Description is required' });
      }

      const order: OwnerOrder = {
        id: uuidv4(),
        description,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        attemptCount: 0,
        nextAttemptAt: Date.now(),
      };

      await store.createOrder(order);

      logger.info(`Autonomous order submitted`, { orderId: order.id });

      return res.json({
        orderId: order.id,
        status: 'submitted',
        autonomous: true,
        message: 'Autonomous order submitted - will be processed by Ralph worker',
      });
    } catch (error) {
      logger.error('Error submitting autonomous order', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        error: 'Failed to submit autonomous order',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * Get order status
   * GET /api/owner/orders/:id
   */
  router.get('/orders/:id', (req: Request, res: Response) => {
    const orderId = req.params.id;
    void storeReady;

    store.getOrder(orderId).then(order => {
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      return store.getReport(orderId).then(report => res.json({
        order: {
          id: order.id,
          description: order.description,
          status: order.status,
          createdAt: order.createdAt,
        },
        report: report ? {
          approved: report.approved,
          reportId: report.report?.id,
          approvalRecordId: report.approvalRecordId,
          gitCommit: report.gitCommit,
          deployed: report.deployed,
        } : null,
      }));
    }).catch(error => {
      logger.error('Error reading order', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: 'Failed to read order' });
    });
  });

  /**
   * Get all orders
   * GET /api/owner/orders
   */
  router.get('/orders', (_req: Request, res: Response) => {
    void storeReady;
    store.listOrders().then(orders => {
      const allOrders = orders.map(order => ({
        id: order.id,
        description: order.description,
        status: order.status,
        createdAt: order.createdAt,
      }));
      res.json({ orders: allOrders });
    }).catch(error => {
      logger.error('Error listing orders', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: 'Failed to list orders' });
    });
  });

  /**
   * Get execution report
   * GET /api/owner/reports/:reportId
   */
  router.get('/reports/:reportId', (req: Request, res: Response) => {
    const reportId = req.params.reportId;
    void storeReady;

    store.findReportByReportId(reportId).then(found => {
      if (!found) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const result = found.report;
      return res.json({
        report: result.report,
        approved: result.approved,
        approvalRecordId: result.approvalRecordId,
        gitCommit: result.gitCommit,
        deployed: result.deployed,
        orderId: found.orderId,
      });
    }).catch(error => {
      logger.error('Error reading report', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: 'Failed to read report' });
    });
  });

  /**
   * Get system metrics
   * GET /api/owner/metrics
   */
  router.get('/metrics', (_req: Request, res: Response) => {
    const metrics = metricsCollector.getMetrics();
    res.json(metrics);
  });

  /**
   * Approve or reject result
   * POST /api/owner/approvals/:reportId
   */
  router.post('/approvals/:reportId', async (req: Request, res: Response) => {
    try {
      await storeReady;
      const { reportId } = req.params;
      const { decision } = req.body as { decision?: ApprovalDecision };

      if (!decision || !['approved', 'rejected', 'requires_improvement'].includes(decision)) {
        return res.status(400).json({
          error: 'Invalid decision. Must be approved, rejected, or requires_improvement',
        });
      }

      const found = await store.findReportByReportId(reportId);
      const report = found?.report.report;
      if (!found || !report) {
        res.status(404).json({ error: 'Report not found' });
        return;
      }

      const reportResult = found.report;
      const foundReport = report;

      // Process human approval through CEO Bitch
      const approvalResult = await ceoBitch.reviewReport(
        foundReport,
        foundReport.qualityScore ? {
          minScore: foundReport.qualityScore,
          requiredFields: [],
        } : {
          minScore: 70,
          requiredFields: [],
        },
        [],
        decision
      );

      // Update order status
      const order = await store.getOrder(found.orderId);
      if (order) {
        const shouldRetry = decision !== 'approved';
        const updated: OwnerOrder = {
          ...order,
          status: decision === 'approved' ? 'completed' : 'pending',
          nextAttemptAt: shouldRetry ? Date.now() : undefined,
          updatedAt: new Date(),
        };
        await store.updateOrder(updated);
      }

      await store.setReport(found.orderId, {
        ...reportResult,
        approved: approvalResult.decision === 'approved',
        approvalRecordId: approvalResult.approvalRecord.id,
      });

      logger.info('Approval decision recorded', {
        reportId,
        orderId: found.orderId,
        decision: approvalResult.decision,
      });

      return res.json({
        decision: approvalResult.decision,
        approvalRecord: approvalResult.approvalRecord,
      });
    } catch (error) {
      logger.error('Error processing approval', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        error: 'Failed to process approval',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return router;
}