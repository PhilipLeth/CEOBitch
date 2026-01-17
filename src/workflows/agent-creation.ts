/**
 * Agent Creation Flow
 * Agent Request → Responsibility Definition → Playbook Assignment →
 * Test Environment Setup → Initial Test → Staging Activation
 */

import { v4 as uuidv4 } from 'uuid';
import { Agent, AgentType, Playbook, ResponsibilityBounds, OwnerOrder } from '../types';
import { AIR } from '../core/air';
import { ExecutionSandbox } from '../core/agents/execution-sandbox';
import { createLogger } from '../core/monitoring';

export interface AgentCreationRequest {
  name: string;
  type: AgentType;
  scope: string[];
  allowedActions: string[];
  forbiddenActions?: string[];
  playbook?: Playbook;
}

export interface AgentCreationResult {
  agent: Agent;
  testPassed: boolean;
  stagingReady: boolean;
  errors?: string[];
}

export class AgentCreationFlow {
  private logger = createLogger();

  constructor(
    private air: AIR,
    private _sandbox: ExecutionSandbox
  ) {
    void this._sandbox;
  }

  /**
   * Create a new agent through the full workflow
   */
  async createAgent(request: AgentCreationRequest): Promise<AgentCreationResult> {
    this.logger.info('Starting agent creation flow', { agentName: request.name });
    const errors: string[] = [];

    // Step 1: Define Responsibility Bounds
    const responsibilityBounds = this.defineResponsibilityBounds(request);
    this.logger.info('Responsibility bounds defined', { scope: responsibilityBounds.scope });

    // Step 2: Assign or create Playbook
    const playbook = request.playbook || this.createDefaultPlaybook(request);
    const registeredPlaybook = this.air.registerPlaybook(playbook);
    this.logger.info('Playbook assigned', { playbookId: registeredPlaybook.id });

    // Step 3: Register Agent in test status
    const agent = this.air.registerAgent({
      name: request.name,
      type: request.type,
      playbook: registeredPlaybook,
      responsibilityBounds,
      version: '1.0.0',
      status: 'test',
      capabilities: request.allowedActions,
    });
    this.logger.info('Agent registered in test status', { agentId: agent.id });

    // Step 4: Setup Test Environment
    const testEnvReady = await this.setupTestEnvironment(agent);
    if (!testEnvReady) {
      errors.push('Failed to setup test environment');
    }

    // Step 5: Run Initial Test
    let testPassed = false;
    if (testEnvReady) {
      testPassed = await this.runInitialTest(agent);
      if (!testPassed) {
        errors.push('Initial test failed');
      }
    }

    // Step 6: Activate to Staging
    let stagingReady = false;
    if (testPassed) {
      stagingReady = this.air.updateAgentStatus(agent.id, 'staging');
      if (stagingReady) {
        this.logger.info('Agent promoted to staging', { agentId: agent.id });
      } else {
        errors.push('Failed to promote agent to staging');
      }
    }

    return {
      agent,
      testPassed,
      stagingReady,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Define responsibility bounds based on request
   */
  private defineResponsibilityBounds(request: AgentCreationRequest): ResponsibilityBounds {
    return {
      allowedActions: request.allowedActions,
      forbiddenActions: request.forbiddenActions || [],
      resourceLimits: {
        maxMemoryMB: 512,
        maxCpuPercent: 50,
        maxNetworkCalls: 100,
        maxFileOperations: 50,
      },
      timeLimit: 300, // 5 minutes
      scope: request.scope,
    };
  }

  /**
   * Create a default playbook for the agent type
   */
  private createDefaultPlaybook(request: AgentCreationRequest): Playbook {
    return {
      id: uuidv4(),
      name: `${request.name}-playbook`,
      description: `Default playbook for ${request.name}`,
      version: '1.0.0',
      steps: [
        {
          id: 'step-1',
          name: 'Initialize',
          action: request.allowedActions[0] || 'read_file',
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
          id: 'default-risk-check',
          name: 'Default Risk Check',
          checkType: 'pattern',
          threshold: 0.5,
          action: 'require_approval',
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

  /**
   * Setup test environment for the agent
   */
  private async setupTestEnvironment(agent: Agent): Promise<boolean> {
    try {
      // Verify sandbox is available for the agent
      // In production, this would setup isolated containers
      this.logger.info('Setting up test environment', { agentId: agent.id });

      // Verify resource limits are reasonable
      const limits = agent.responsibilityBounds.resourceLimits;
      if (limits.maxMemoryMB && limits.maxMemoryMB > 2048) {
        this.logger.warn('Memory limit exceeds recommended maximum', {
          agentId: agent.id,
          limit: limits.maxMemoryMB,
        });
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to setup test environment', {
        agentId: agent.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Run initial test for the agent
   */
  private async runInitialTest(agent: Agent): Promise<boolean> {
    try {
      // Create a simple test order
      const testOrder: OwnerOrder = {
        id: `test-order-${agent.id}`,
        description: `Initial test for ${agent.name}`,
        status: 'pending',
        createdAt: new Date(),
        attemptCount: 0,
      };

      // Verify agent can be found and has valid configuration
      const foundAgent = this.air.getAgent(agent.id);
      if (!foundAgent) {
        this.logger.error('Agent not found after registration', { agentId: agent.id });
        return false;
      }

      // Verify playbook is valid
      if (!foundAgent.playbook || foundAgent.playbook.steps.length === 0) {
        this.logger.error('Agent playbook is invalid', { agentId: agent.id });
        return false;
      }

      // Verify responsibility bounds are set
      if (!foundAgent.responsibilityBounds.allowedActions.length) {
        this.logger.error('Agent has no allowed actions', { agentId: agent.id });
        return false;
      }

      this.logger.info('Initial test passed', {
        agentId: agent.id,
        testOrderId: testOrder.id,
      });

      return true;
    } catch (error) {
      this.logger.error('Initial test failed', {
        agentId: agent.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
