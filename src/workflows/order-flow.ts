/**
 * Order Flow - orchestrates the complete order execution workflow
 */

import { v4 as uuidv4 } from 'uuid';
import { OwnerOrder, ExecutionReport, Agent, AgentType } from '../types';
import { AIR } from '../core/air';
import { ExecutionSandbox } from '../core/agents/execution-sandbox';
import { CEOBitch } from '../core/ceo-bitch';
import { CapabilityRegistry } from '../core/capabilities';
import { createLogger } from '../core/monitoring';
import { metricsCollector } from '../core/monitoring';

interface OrderFlowResult {
  orderId: string;
  report: ExecutionReport;
  approved: boolean;
  approvalRecordId?: string;
}

export class OrderFlow {
  constructor(
    private air: AIR,
    private _sandbox: ExecutionSandbox,
    private ceoBitch: CEOBitch,
    private _capabilities: CapabilityRegistry,
    private logger = createLogger()
  ) {
    // Properties prefixed with _ are intentionally unused for future implementation
    void this._sandbox;
    void this._capabilities;
  }

  /**
   * Execute complete order flow
   */
  async executeOrder(order: OwnerOrder): Promise<OrderFlowResult> {
    this.logger.info(`Starting order flow for order ${order.id}`, { orderId: order.id });

    try {
      const agentType = this.ceoBitch.selectAgentTypeForOrder(order);
      this.logger.info(`Selected agent type for order`, {
        orderId: order.id,
        agentType,
      });

      // Step 1: AIR routes/finds/creates agent
      let agent = this.air.routeOrder(order);
      
      if (!agent) {
        // Create new agent if none exists
        const playbook = this.getDefaultPlaybookForType(agentType);
        agent = await this.air.ensureAgentForOrder(order, agentType, playbook);
        this.logger.info(`Created new agent ${agent.id} for order ${order.id}`, {
          agentId: agent.id,
          orderId: order.id,
        });
      }

      // Step 2: Execute in staging
      const report = await this.executeInStaging(order, agent);

      // Step 3: CEO Bitch review
      const approvalResult = await this.ceoBitch.reviewReport(
        report,
        agent.playbook.qualityCriteria,
        agent.playbook.riskChecks
      );

      // Step 4: Record metrics
      metricsCollector.recordExecution(report);
      metricsCollector.recordApproval(report.id, approvalResult.decision === 'approved');

      this.logger.info(`Order flow completed for order ${order.id}`, {
        orderId: order.id,
        decision: approvalResult.decision,
      });

      return {
        orderId: order.id,
        report,
        approved: approvalResult.decision === 'approved',
        approvalRecordId: approvalResult.approvalRecord.id,
      };
    } catch (error) {
      this.logger.error(`Order flow failed for order ${order.id}`, {
        orderId: order.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute agent work in staging environment
   */
  private async executeInStaging(order: OwnerOrder, agent: Agent): Promise<ExecutionReport> {
    // Simplified execution for now - full implementation would use BaseAgent

    // Simplified report generation - full implementation would execute in sandbox
    const report: ExecutionReport = {
      id: `exec-${order.id}`,
      agentId: agent.id,
      orderId: order.id,
      status: 'requires_approval',
      output: {
        success: true,
        orderId: order.id,
        message: order.description,
      },
      logs: [
        {
          timestamp: new Date(),
          level: 'info',
          message: `Execution completed for order: ${order.description}`,
        },
      ],
      timestamp: new Date(),
      executionTimeMs: 1000,
      environment: 'staging',
    };

    return report;
  }

  /**
   * Get default playbook for agent type
   */
  private getDefaultPlaybookForType(agentType: AgentType) {
    // Return a basic playbook - in production this would be more sophisticated
    return {
      id: uuidv4(),
      name: `default-${agentType}-playbook`,
      version: '1.0.0',
      steps: [
        {
          id: 'step-1',
          name: 'Execute task',
          action: 'read_file', // Default action - will be replaced based on order
          inputs: {},
          outputs: ['result'],
        },
      ],
      qualityCriteria: {
        minScore: 70,
        requiredFields: ['result'],
      },
      riskChecks: [
        {
          id: 'risk-1',
          name: 'Error Check',
          checkType: 'pattern' as const,
          threshold: 0.5,
          action: 'require_approval' as const,
          description: 'Check for errors in execution',
        },
      ],
      reportFormat: {
        structure: {},
        requiredSections: ['result'],
      },
      createdAt: new Date(),
    };
  }
}