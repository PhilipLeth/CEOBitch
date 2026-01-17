/**
 * AIR - Agent Intelligence Runtime
 * Main orchestrator for agent management and organization
 */

import { Agent, AgentType, AgentStatus, Playbook, OwnerOrder } from '../../types';
import { AgentRegistry } from './agent-registry';
import { PlaybookEngine } from './playbook-engine';
import { OrganizationVersioning } from './organization-versioning';

export class AIR {
  private agentRegistry: AgentRegistry;
  private playbookEngine: PlaybookEngine;
  private organizationVersioning: OrganizationVersioning;

  constructor() {
    this.agentRegistry = new AgentRegistry();
    this.playbookEngine = new PlaybookEngine();
    this.organizationVersioning = new OrganizationVersioning(
      this.agentRegistry,
      this.playbookEngine
    );
  }

  /**
   * Route an order to the appropriate agent
   */
  routeOrder(_order: OwnerOrder): Agent | null {
    // Simple routing logic - can be enhanced with AI-based selection
    // For now, find agent by type or create new agent if needed
    
    // Try to find suitable agent
    const allAgents = this.agentRegistry.getAllAgents('live');
    
    // TODO: Implement intelligent routing based on order description
    // For now, return first available agent or null
    
    if (allAgents.length > 0) {
      return allAgents[0];
    }
    
    return null;
  }

  /**
   * Create or find agent for an order
   */
  async ensureAgentForOrder(
    _order: OwnerOrder,
    agentType: AgentType,
    playbook: Playbook
  ): Promise<Agent> {
    // Check if suitable agent exists
    const existingAgents = this.agentRegistry.findAgentsByType(agentType, 'live');
    
    if (existingAgents.length > 0) {
      // Use existing agent
      return existingAgents[0];
    }

    // Create new agent
    return this.createAgent({
      name: `${agentType}-agent-${Date.now()}`,
      type: agentType,
      playbook,
      responsibilityBounds: this.getDefaultResponsibilityBounds(agentType),
      version: '1.0.0',
      status: 'test', // Always start in test
      capabilities: [],
    });
  }

  /**
   * Create a new agent
   */
  createAgent(agentData: {
    name: string;
    type: AgentType;
    playbook: Playbook;
    responsibilityBounds?: Agent['responsibilityBounds'];
    version?: string;
    status?: AgentStatus;
    capabilities?: string[];
  }): Agent {
    // Validate playbook
    const validation = this.playbookEngine.validatePlaybook(agentData.playbook);
    if (!validation.valid) {
      throw new Error(`Invalid playbook: ${validation.errors.join(', ')}`);
    }

    // Ensure playbook is registered
    const playbook = this.playbookEngine.registerPlaybook(agentData.playbook);

    // Create agent
    const agent = this.agentRegistry.registerAgent({
      name: agentData.name,
      type: agentData.type,
      playbook,
      responsibilityBounds:
        agentData.responsibilityBounds ||
        this.getDefaultResponsibilityBounds(agentData.type),
      version: agentData.version || '1.0.0',
      status: agentData.status || 'test',
      capabilities: agentData.capabilities || [],
    });

    return agent;
  }

  /**
   * Get default responsibility bounds for agent type
   */
  private getDefaultResponsibilityBounds(agentType: AgentType): Agent['responsibilityBounds'] {
    const defaults: Record<AgentType, Agent['responsibilityBounds']> = {
      code: {
        allowedActions: ['read_file', 'write_file', 'execute_code'],
        forbiddenActions: ['delete_file', 'system_command'],
        resourceLimits: {
          maxMemoryMB: 256,
          maxCpuPercent: 30,
          maxNetworkCalls: 5,
          maxFileOperations: 20,
        },
        timeLimit: 300,
        scope: ['code', 'files'],
      },
      analysis: {
        allowedActions: ['read_file', 'analyze_data', 'generate_report'],
        forbiddenActions: ['write_file', 'execute_code'],
        resourceLimits: {
          maxMemoryMB: 512,
          maxCpuPercent: 50,
          maxNetworkCalls: 3,
        },
        timeLimit: 600,
        scope: ['data', 'analysis'],
      },
      communication: {
        allowedActions: ['send_message', 'read_message', 'format_output'],
        forbiddenActions: ['execute_code', 'modify_files'],
        resourceLimits: {
          maxMemoryMB: 128,
          maxNetworkCalls: 10,
        },
        timeLimit: 180,
        scope: ['communication', 'messages'],
      },
      research: {
        allowedActions: ['search', 'read_file', 'summarize'],
        forbiddenActions: ['write_file', 'execute_code'],
        resourceLimits: {
          maxMemoryMB: 256,
          maxNetworkCalls: 15,
        },
        timeLimit: 900,
        scope: ['research', 'information'],
      },
      execution: {
        allowedActions: ['execute_code', 'run_command', 'monitor'],
        forbiddenActions: ['delete_file', 'system_command'],
        resourceLimits: {
          maxMemoryMB: 512,
          maxCpuPercent: 70,
          maxNetworkCalls: 5,
        },
        timeLimit: 600,
        scope: ['execution', 'operations'],
      },
      custom: {
        allowedActions: [],
        forbiddenActions: [],
        resourceLimits: {},
        scope: [],
      },
    };

    return defaults[agentType] || defaults.custom;
  }

  /**
   * Promote agent from test to staging
   */
  promoteToStaging(agentId: string): boolean {
    const agent = this.agentRegistry.getAgent(agentId);
    if (!agent || agent.status !== 'test') {
      return false;
    }

    return this.agentRegistry.updateAgentStatus(agentId, 'staging');
  }

  /**
   * Promote agent from staging to live
   */
  promoteToLive(agentId: string): boolean {
    const agent = this.agentRegistry.getAgent(agentId);
    if (!agent || agent.status !== 'staging') {
      return false;
    }

    return this.agentRegistry.updateAgentStatus(agentId, 'live');
  }

  /**
   * Get agent registry (for internal use)
   */
  getAgentRegistry(): AgentRegistry {
    return this.agentRegistry;
  }

  /**
   * Get playbook engine (for internal use)
   */
  getPlaybookEngine(): PlaybookEngine {
    return this.playbookEngine;
  }

  /**
   * Get organization versioning (for internal use)
   */
  getOrganizationVersioning(): OrganizationVersioning {
    return this.organizationVersioning;
  }

  /**
   * Register an agent (delegate to registry)
   */
  registerAgent(agentData: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Agent {
    return this.agentRegistry.registerAgent(agentData);
  }

  /**
   * Get agent by ID
   */
  getAgent(id: string): Agent | undefined {
    return this.agentRegistry.getAgent(id);
  }

  /**
   * Get all agents
   */
  getAllAgents(status?: AgentStatus): Agent[] {
    return this.agentRegistry.getAllAgents(status);
  }

  /**
   * Update agent status
   */
  updateAgentStatus(id: string, status: AgentStatus): boolean {
    return this.agentRegistry.updateAgentStatus(id, status);
  }

  /**
   * Register a playbook
   */
  registerPlaybook(playbook: Playbook): Playbook {
    return this.playbookEngine.registerPlaybook(playbook);
  }

  /**
   * Get all playbooks
   */
  getAllPlaybooks(): Playbook[] {
    return this.playbookEngine.getAllPlaybooks();
  }

  /**
   * Get current organization version
   */
  getCurrentOrganizationVersion() {
    return this.organizationVersioning.getCurrentVersion();
  }

  /**
   * Create organization snapshot
   */
  createOrganizationSnapshot() {
    return this.organizationVersioning.createVersion();
  }
}