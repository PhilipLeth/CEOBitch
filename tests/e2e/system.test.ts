/**
 * End-to-End tests for CEOBitch system
 */

import { AIR } from '../../src/core/air';
import { CEOBitch } from '../../src/core/ceo-bitch';
import { ExecutionSandbox } from '../../src/core/agents/execution-sandbox';
import { CapabilityRegistry } from '../../src/core/capabilities';
import { OrderFlow } from '../../src/workflows/order-flow';
import { QualityGateFlow } from '../../src/workflows/quality-gate';
import { AgentCreationFlow, AgentCreationRequest } from '../../src/workflows/agent-creation';
import { OwnerOrder } from '../../src/types';

describe('CEOBitch E2E Tests', () => {
  let air: AIR;
  let ceoBitch: CEOBitch;
  let sandbox: ExecutionSandbox;
  let capabilities: CapabilityRegistry;
  let orderFlow: OrderFlow;
  let qualityGateFlow: QualityGateFlow;
  let agentCreationFlow: AgentCreationFlow;

  beforeEach(() => {
    air = new AIR();
    ceoBitch = new CEOBitch();
    sandbox = new ExecutionSandbox();
    capabilities = new CapabilityRegistry();
    orderFlow = new OrderFlow(air, sandbox, ceoBitch, capabilities);
    qualityGateFlow = new QualityGateFlow(ceoBitch);
    agentCreationFlow = new AgentCreationFlow(air, sandbox);
  });

  describe('Complete Order Flow', () => {
    it('should process an order from submission to approval', async () => {
      // Step 1: Submit order
      const order: OwnerOrder = {
        id: 'e2e-order-1',
        description: 'Process code files and generate report',
        status: 'pending',
        createdAt: new Date(),
        attemptCount: 0,
      };

      // Step 2: Execute order
      const orderResult = await orderFlow.executeOrder(order);

      expect(orderResult.report).toBeDefined();
      expect(orderResult.report.environment).toBe('staging');

      // Step 3: Quality gate review
      const qualityResult = await qualityGateFlow.runQualityGate(
        orderResult.report,
        { minScore: 50, requiredFields: [] },
        []
      );

      expect(qualityResult.decision).toBeDefined();
      expect(['approved', 'rejected', 'requires_improvement']).toContain(qualityResult.decision);
    });
  });

  describe('Agent Creation Flow', () => {
    it('should create an agent and promote to staging', async () => {
      const request: AgentCreationRequest = {
        name: 'e2e-test-agent',
        type: 'code',
        scope: ['testing', 'code'],
        allowedActions: ['read_file', 'write_file'],
      };

      const result = await agentCreationFlow.createAgent(request);

      expect(result.agent).toBeDefined();
      expect(result.agent.name).toBe('e2e-test-agent');
      expect(result.testPassed).toBe(true);
      expect(result.stagingReady).toBe(true);
    });
  });

  describe('Organization Versioning', () => {
    it('should track organization versions', async () => {
      // Create an agent
      const request: AgentCreationRequest = {
        name: 'version-test-agent',
        type: 'analysis',
        scope: ['analysis'],
        allowedActions: ['analyze_data'],
      };

      await agentCreationFlow.createAgent(request);

      // Create organization snapshot
      const snapshot = air.createOrganizationSnapshot();

      expect(snapshot).toBeDefined();
      expect(snapshot.version).toBeDefined();
    });
  });

  describe('System Safety', () => {
    it('should stop all executions when requested', () => {
      sandbox.stopAllExecutions();
      const activeExecutions = sandbox.getActiveExecutions();
      expect(activeExecutions).toHaveLength(0);
    });
  });
});
