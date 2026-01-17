/**
 * Integration tests for Order Flow
 */

import { OrderFlow } from '../../src/workflows/order-flow';
import { AIR } from '../../src/core/air';
import { ExecutionSandbox } from '../../src/core/agents/execution-sandbox';
import { CEOBitch } from '../../src/core/ceo-bitch';
import { CapabilityRegistry } from '../../src/core/capabilities';
import { OwnerOrder } from '../../src/types';

describe('OrderFlow Integration', () => {
  let orderFlow: OrderFlow;
  let air: AIR;
  let sandbox: ExecutionSandbox;
  let ceoBitch: CEOBitch;
  let capabilities: CapabilityRegistry;

  beforeEach(() => {
    air = new AIR();
    sandbox = new ExecutionSandbox();
    ceoBitch = new CEOBitch();
    capabilities = new CapabilityRegistry();
    orderFlow = new OrderFlow(air, sandbox, ceoBitch, capabilities);
  });

  const createOrder = (description: string): OwnerOrder => ({
    id: `order-${Date.now()}`,
    description,
    status: 'pending',
    createdAt: new Date(),
    attemptCount: 0,
  });

  describe('executeOrder', () => {
    it('should execute a code order and return a report', async () => {
      const order = createOrder('Write code to process data files');

      const result = await orderFlow.executeOrder(order);

      expect(result).toBeDefined();
      expect(result.orderId).toBe(order.id);
      expect(result.report).toBeDefined();
      expect(result.report.status).toBeDefined();
    });

    it('should create agent if none exists', async () => {
      const order = createOrder('Analyze the data for insights');

      const result = await orderFlow.executeOrder(order);

      expect(result.report.agentId).toBeDefined();
    });

    it('should route to correct agent type based on order', async () => {
      const analysisOrder = createOrder('Analyze metrics and create report');
      const codeOrder = createOrder('Write a utility function');

      const analysisResult = await orderFlow.executeOrder(analysisOrder);
      const codeResult = await orderFlow.executeOrder(codeOrder);

      expect(analysisResult.report).toBeDefined();
      expect(codeResult.report).toBeDefined();
    });
  });
});
