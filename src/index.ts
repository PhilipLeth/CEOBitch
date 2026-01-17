/**
 * CEOBitch - Main entry point
 */

import { AIR } from './core/air';
import { ExecutionSandbox } from './core/agents/execution-sandbox';
import { CEOBitch } from './core/ceo-bitch';
import { initializeCapabilities } from './core/capabilities';
import { OrderFlow } from './workflows/order-flow';
import { AutonomousOrderFlow } from './workflows/autonomous-order-flow';
import { createAPI } from './api';
import { initializeLogger, createLogger } from './core/monitoring';
import { stopControl } from './core/safety';
import { config } from './config';
import { OrderStore } from './core/storage/order-store';
import { OrderProcessor } from './core/autonomous/order-processor';
import { TargetContext, loadTarget } from './targets';

/**
 * Parse CLI arguments for --target flag
 */
function parseArgs(): { target?: string } {
  const args = process.argv.slice(2);
  const targetIndex = args.indexOf('--target');
  
  if (targetIndex !== -1 && args[targetIndex + 1]) {
    return { target: args[targetIndex + 1] };
  }
  
  if (process.env.TARGET) {
    return { target: process.env.TARGET };
  }
  
  return {};
}

async function main() {
  // Initialize logger
  initializeLogger();
  const logger = createLogger();

  const cliArgs = parseArgs();

  logger.info('Starting CEOBitch AI Organization System');

  try {
    // Load target context if specified
    let targetContext: TargetContext | undefined;
    if (cliArgs.target) {
      logger.info(`Loading target: ${cliArgs.target}`);
      targetContext = await TargetContext.create(cliArgs.target);
      logger.info(`Target loaded: ${cliArgs.target}`, {
        repoPath: targetContext.getCwd(),
        writeAllow: targetContext.getConfig().writeAllow,
      });
    }

    // Initialize core components
    const air = new AIR();
    const sandbox = new ExecutionSandbox();
    const ceoBitch = new CEOBitch();
    const capabilities = initializeCapabilities();

    // Initialize stop control
    stopControl.initialize(sandbox);

    // Expose target context for order processor if available
    void targetContext;
    void loadTarget;

    // Create order flows
    const orderFlow = new OrderFlow(air, sandbox, ceoBitch, capabilities, logger);
    const autonomousOrderFlow = new AutonomousOrderFlow(
      air,
      sandbox,
      ceoBitch,
      capabilities,
      logger
    );

    // Create API
    const app = createAPI(orderFlow, autonomousOrderFlow, ceoBitch);

    // Start autonomous order processor
    const orderStore = new OrderStore();
    const orderProcessor = new OrderProcessor(orderStore, autonomousOrderFlow);
    await orderProcessor.init();
    orderProcessor.start();

    // Start server
    const port = config.port;
    app.listen(port, () => {
      logger.info(`CEOBitch server running on port ${port}`, { port });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      stopControl.stopAll('SIGTERM');
      orderProcessor.stop();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      stopControl.stopAll('SIGINT');
      orderProcessor.stop();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start CEOBitch', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

main();