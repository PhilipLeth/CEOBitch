/**
 * Agent Registry - manages agent creation, versioning, and lifecycle
 */

import { v4 as uuidv4 } from 'uuid';
import { Agent, AgentStatus } from '../../types';

export class AgentRegistry {
  private agents: Map<string, Agent> = new Map();
  private agentsByName: Map<string, Agent[]> = new Map();

  /**
   * Register a new agent or update existing
   */
  registerAgent(agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Agent {
    const existingAgent = this.findAgentByName(agent.name, agent.version);
    
    if (existingAgent) {
      // Update existing agent
      const updated: Agent = {
        ...existingAgent,
        ...agent,
        updatedAt: new Date(),
      };
      this.agents.set(updated.id, updated);
      this.updateNameIndex(updated);
      return updated;
    }

    // Create new agent
    const newAgent: Agent = {
      ...agent,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.agents.set(newAgent.id, newAgent);
    this.updateNameIndex(newAgent);
    
    return newAgent;
  }

  /**
   * Get agent by ID
   */
  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  /**
   * Find agent by name and optionally version
   */
  findAgentByName(name: string, version?: string): Agent | undefined {
    const candidates = this.agentsByName.get(name) || [];
    
    if (version) {
      return candidates.find(a => a.version === version);
    }
    
    // Return latest version in staging or live status
    const liveAgents = candidates.filter(a => 
      a.status === 'live' || a.status === 'staging'
    );
    
    if (liveAgents.length > 0) {
      return liveAgents.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];
    }
    
    return candidates[candidates.length - 1];
  }

  /**
   * Find agents by type
   */
  findAgentsByType(type: Agent['type'], status?: AgentStatus): Agent[] {
    const allAgents = Array.from(this.agents.values());
    let filtered = allAgents.filter(a => a.type === type);
    
    if (status) {
      filtered = filtered.filter(a => a.status === status);
    }
    
    return filtered;
  }

  /**
   * Get all agents
   */
  getAllAgents(status?: AgentStatus): Agent[] {
    const allAgents = Array.from(this.agents.values());
    
    if (status) {
      return allAgents.filter(a => a.status === status);
    }
    
    return allAgents;
  }

  /**
   * Update agent status
   */
  updateAgentStatus(id: string, status: AgentStatus): boolean {
    const agent = this.agents.get(id);
    if (!agent) {
      return false;
    }

    agent.status = status;
    agent.updatedAt = new Date();
    this.agents.set(id, agent);
    this.updateNameIndex(agent);
    
    return true;
  }

  /**
   * Deprecate agent
   */
  deprecateAgent(id: string): boolean {
    return this.updateAgentStatus(id, 'deprecated');
  }

  /**
   * Delete agent (soft delete by deprecating)
   */
  deleteAgent(id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent) {
      return false;
    }

    // Don't actually delete, just deprecate
    return this.deprecateAgent(id);
  }

  /**
   * Update name index for efficient lookup
   */
  private updateNameIndex(agent: Agent): void {
    const existing = this.agentsByName.get(agent.name) || [];
    const index = existing.findIndex(a => a.id === agent.id);
    
    if (index >= 0) {
      existing[index] = agent;
    } else {
      existing.push(agent);
    }
    
    this.agentsByName.set(agent.name, existing);
  }
}