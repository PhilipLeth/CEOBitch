/**
 * Main API setup
 */

import express, { Express } from 'express';
import * as path from 'path';
import { createOwnerRoutes } from './owner/routes';
import { OrderFlow } from '../workflows/order-flow';
import { AutonomousOrderFlow } from '../workflows/autonomous-order-flow';
import { CEOBitch } from '../core/ceo-bitch';
import { createLogger } from '../core/monitoring';

export function createAPI(
  orderFlow: OrderFlow,
  autonomousOrderFlow: AutonomousOrderFlow,
  ceoBitch: CEOBitch
): Express {
  const app = express();
  const logger = createLogger();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Serve static files
  app.use(express.static(path.join(__dirname, '../../public')));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Owner API
  app.use('/api/owner', createOwnerRoutes(orderFlow, autonomousOrderFlow, ceoBitch));

  // Error handling
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('API error', {
      error: err.message,
      stack: err.stack,
      path: _req.path,
    });

    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  });

  return app;
}