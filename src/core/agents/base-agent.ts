/**
 * Base Agent - foundation for all AI agents
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Agent,
  ExecutionContext,
  ExecutionReport,
  ExecutionLog,
  PlaybookStep,
  OwnerOrder,
  Capability,
} from '../../types';
import { ExecutionSandbox } from './execution-sandbox';
import { Logger } from '../../types';

export abstract class BaseAgent {
  protected agent: Agent;
  protected sandbox: ExecutionSandbox;
  protected logger: Logger;

  constructor(agent: Agent, sandbox: ExecutionSandbox, logger: Logger) {
    this.agent = agent;
    this.sandbox = sandbox;
    this.logger = logger;
  }

  /**
   * Execute work based on playbook
   */
  async executeOrder(order: OwnerOrder, capabilities: Map<string, Capability>): Promise<ExecutionReport> {
    const executionId = uuidv4();
    const logs: ExecutionLog[] = [];
    const startTime = Date.now();

    this.logger.info(`Agent ${this.agent.id} starting execution for order ${order.id}`, {
      agentId: this.agent.id,
      orderId: order.id,
      environment: 'staging', // Always start in staging
    });

    logs.push({
      timestamp: new Date(),
      level: 'info',
      message: `Execution started for order: ${order.description}`,
    });

    // Create execution context
    const context: ExecutionContext = {
      agentId: this.agent.id,
      orderId: order.id,
      environment: 'staging',
      capabilities,
      logger: {
        debug: (msg, metadata) => {
          logs.push({ timestamp: new Date(), level: 'debug', message: msg, metadata });
          this.logger.debug(msg, metadata);
        },
        info: (msg, metadata) => {
          logs.push({ timestamp: new Date(), level: 'info', message: msg, metadata });
          this.logger.info(msg, metadata);
        },
        warn: (msg, metadata) => {
          logs.push({ timestamp: new Date(), level: 'warn', message: msg, metadata });
          this.logger.warn(msg, metadata);
        },
        error: (msg, metadata) => {
          logs.push({ timestamp: new Date(), level: 'error', message: msg, metadata });
          this.logger.error(msg, metadata);
        },
      },
    };

    try {
      // Validate responsibility bounds
      this.validateResponsibilityBounds(order, context);

      // Execute playbook steps
      let output: unknown = null;
      for (const step of this.agent.playbook.steps) {
        output = await this.executeStep(step, context, output);
        
        // Check if execution was stopped
        if (!this.sandbox.isExecutionActive(executionId)) {
          throw new Error('Execution stopped by sandbox');
        }
      }

      const executionTimeMs = Date.now() - startTime;

      logs.push({
        timestamp: new Date(),
        level: 'info',
        message: 'Execution completed successfully',
      });

      // Generate execution report
      const report: ExecutionReport = {
        id: uuidv4(),
        agentId: this.agent.id,
        orderId: order.id,
        status: 'requires_approval', // Always requires approval before live
        output,
        logs,
        timestamp: new Date(),
        executionTimeMs,
        environment: 'staging',
      };

      return report;
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logs.push({
        timestamp: new Date(),
        level: 'error',
        message: `Execution failed: ${errorMessage}`,
        metadata: { error: errorMessage },
      });

      // Generate failure report
      const report: ExecutionReport = {
        id: uuidv4(),
        agentId: this.agent.id,
        orderId: order.id,
        status: 'failed',
        output: null,
        logs,
        timestamp: new Date(),
        executionTimeMs,
        environment: 'staging',
      };

      return report;
    }
  }

  /**
   * Execute a single playbook step
   */
  protected async executeStep(
    step: PlaybookStep,
    context: ExecutionContext,
    _previousOutput: unknown
  ): Promise<unknown> {
    context.logger.info(`Executing step: ${step.name}`, {
      stepId: step.id,
      action: step.action,
    });

    // Check if action is allowed
    if (!this.agent.responsibilityBounds.allowedActions.includes(step.action)) {
      // Check if it's explicitly forbidden
      if (this.agent.responsibilityBounds.forbiddenActions.includes(step.action)) {
        throw new Error(`Action ${step.action} is forbidden for this agent`);
      }
      throw new Error(`Action ${step.action} is not in allowed actions`);
    }

    // Get capability for this action
    const capability = context.capabilities.get(step.action);
    if (!capability) {
      throw new Error(`Capability not found for action: ${step.action}`);
    }

      // Prepare inputs
      const inputs = {
        ...step.inputs,
        previousOutput: _previousOutput,
        context,
      };

    // Execute capability with retry logic
    let lastError: Error | null = null;
    const retryPolicy = step.retryPolicy || { maxRetries: 0, backoffMs: 0, retryOn: [] };

    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          context.logger.info(`Retrying step ${step.name}, attempt ${attempt + 1}`, {
            stepId: step.id,
          });
          await this.sleep(retryPolicy.backoffMs * attempt);
        }

        // Validate inputs if validation rules exist
        if (step.validation) {
          this.validateStepInputs(step, inputs as unknown);
        }

        // Execute capability
        const result = await capability.action(inputs);

        // Validate outputs if validation rules exist
        if (step.validation) {
          this.validateStepOutputs(step, result as unknown);
        }

        context.logger.info(`Step completed: ${step.name}`, {
          stepId: step.id,
        });

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if error is retryable
        const isRetryable = retryPolicy.retryOn.some(pattern =>
          lastError!.message.includes(pattern)
        );

        if (!isRetryable || attempt >= retryPolicy.maxRetries) {
          throw lastError;
        }
      }
    }

    throw lastError || new Error('Step execution failed');
  }

  /**
   * Validate responsibility bounds
   */
  protected validateResponsibilityBounds(order: OwnerOrder, _context: ExecutionContext): void {
    // Check scope
    if (this.agent.responsibilityBounds.scope.length > 0) {
      // Simple scope check - in production use more sophisticated matching
      const orderText = order.description.toLowerCase();
      const scopeMatch = this.agent.responsibilityBounds.scope.some(scope =>
        orderText.includes(scope.toLowerCase())
      );

      if (!scopeMatch) {
        throw new Error(`Order is outside agent's scope: ${this.agent.responsibilityBounds.scope.join(', ')}`);
      }
    }
  }

  /**
   * Validate step inputs
   */
  protected validateStepInputs(step: PlaybookStep, _inputs: unknown): void {
    if (!step.validation) {
      return;
    }

    for (const rule of step.validation) {
      // Simplified validation - in production use proper schema validation
      if (rule.type === 'schema' && typeof rule.rule === 'object') {
        // Schema validation would go here
      }
    }
  }

  /**
   * Validate step outputs
   */
  protected validateStepOutputs(step: PlaybookStep, _output: unknown): void {
    if (!step.validation) {
      return;
    }

    // Output validation would go here
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get agent info
   */
  getAgent(): Agent {
    return this.agent;
  }
}