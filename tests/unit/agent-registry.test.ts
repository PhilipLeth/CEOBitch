/**
 * Unit tests for Agent Registry
 */

import { AgentRegistry } from '../../src/core/air/agent-registry';
import { Agent, Playbook } from '../../src/types';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;
  let samplePlaybook: Playbook;

  beforeEach(() => {
    registry = new AgentRegistry();
    samplePlaybook = {
      id: 'playbook-1',
      name: 'test-playbook',
      version: '1.0.0',
      steps: [],
      qualityCriteria: { minScore: 70, requiredFields: [] },
      riskChecks: [],
      reportFormat: { structure: {}, requiredSections: [] },
      createdAt: new Date(),
    };
  });

  describe('registerAgent', () => {
    it('should register a new agent', () => {
      const agentData: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'test-agent',
        type: 'code',
        playbook: samplePlaybook,
        responsibilityBounds: {
          allowedActions: ['read_file'],
          forbiddenActions: [],
          resourceLimits: {},
          scope: ['code'],
        },
        version: '1.0.0',
        status: 'test',
        capabilities: [],
      };

      const agent = registry.registerAgent(agentData);

      expect(agent.id).toBeDefined();
      expect(agent.name).toBe('test-agent');
      expect(agent.type).toBe('code');
      expect(agent.status).toBe('test');
    });

    it('should update existing agent with same name and version', () => {
      const agentData: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'test-agent',
        type: 'code',
        playbook: samplePlaybook,
        responsibilityBounds: {
          allowedActions: ['read_file'],
          forbiddenActions: [],
          resourceLimits: {},
          scope: ['code'],
        },
        version: '1.0.0',
        status: 'test',
        capabilities: [],
      };

      const agent1 = registry.registerAgent(agentData);
      const agent2 = registry.registerAgent({ ...agentData, status: 'staging' });

      expect(agent1.id).toBe(agent2.id);
      expect(agent2.status).toBe('staging');
    });
  });

  describe('getAgent', () => {
    it('should return agent by ID', () => {
      const agentData: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'test-agent',
        type: 'code',
        playbook: samplePlaybook,
        responsibilityBounds: {
          allowedActions: [],
          forbiddenActions: [],
          resourceLimits: {},
          scope: [],
        },
        version: '1.0.0',
        status: 'test',
        capabilities: [],
      };

      const registered = registry.registerAgent(agentData);
      const found = registry.getAgent(registered.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(registered.id);
    });

    it('should return undefined for non-existent agent', () => {
      const found = registry.getAgent('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('findAgentByName', () => {
    it('should find agent by name', () => {
      const agentData: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'unique-agent',
        type: 'analysis',
        playbook: samplePlaybook,
        responsibilityBounds: {
          allowedActions: [],
          forbiddenActions: [],
          resourceLimits: {},
          scope: [],
        },
        version: '1.0.0',
        status: 'staging',
        capabilities: [],
      };

      registry.registerAgent(agentData);
      const found = registry.findAgentByName('unique-agent');

      expect(found).toBeDefined();
      expect(found?.name).toBe('unique-agent');
    });
  });

  describe('updateAgentStatus', () => {
    it('should update agent status', () => {
      const agentData: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'status-agent',
        type: 'code',
        playbook: samplePlaybook,
        responsibilityBounds: {
          allowedActions: [],
          forbiddenActions: [],
          resourceLimits: {},
          scope: [],
        },
        version: '1.0.0',
        status: 'test',
        capabilities: [],
      };

      const agent = registry.registerAgent(agentData);
      const success = registry.updateAgentStatus(agent.id, 'live');

      expect(success).toBe(true);
      expect(registry.getAgent(agent.id)?.status).toBe('live');
    });

    it('should return false for non-existent agent', () => {
      const success = registry.updateAgentStatus('non-existent', 'live');
      expect(success).toBe(false);
    });
  });

  describe('getAllAgents', () => {
    it('should return all agents', () => {
      const agentData1: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'agent-1',
        type: 'code',
        playbook: samplePlaybook,
        responsibilityBounds: {
          allowedActions: [],
          forbiddenActions: [],
          resourceLimits: {},
          scope: [],
        },
        version: '1.0.0',
        status: 'live',
        capabilities: [],
      };

      const agentData2: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'agent-2',
        type: 'analysis',
        playbook: samplePlaybook,
        responsibilityBounds: {
          allowedActions: [],
          forbiddenActions: [],
          resourceLimits: {},
          scope: [],
        },
        version: '1.0.0',
        status: 'staging',
        capabilities: [],
      };

      registry.registerAgent(agentData1);
      registry.registerAgent(agentData2);

      const allAgents = registry.getAllAgents();
      expect(allAgents).toHaveLength(2);
    });

    it('should filter agents by status', () => {
      const agentData: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'live-agent',
        type: 'code',
        playbook: samplePlaybook,
        responsibilityBounds: {
          allowedActions: [],
          forbiddenActions: [],
          resourceLimits: {},
          scope: [],
        },
        version: '1.0.0',
        status: 'live',
        capabilities: [],
      };

      registry.registerAgent(agentData);

      const liveAgents = registry.getAllAgents('live');
      const testAgents = registry.getAllAgents('test');

      expect(liveAgents).toHaveLength(1);
      expect(testAgents).toHaveLength(0);
    });
  });
});
