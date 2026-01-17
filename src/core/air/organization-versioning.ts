/**
 * Organization Versioning - tracks versions of the entire organization
 */

import { v4 as uuidv4 } from 'uuid';
import { OrganizationVersion } from '../../types';
import { AgentRegistry } from './agent-registry';
import { PlaybookEngine } from './playbook-engine';

export class OrganizationVersioning {
  private versions: OrganizationVersion[] = [];
  private currentVersion: OrganizationVersion | null = null;

  constructor(
    private agentRegistry: AgentRegistry,
    private playbookEngine: PlaybookEngine
  ) {}

  /**
   * Create a new organization version snapshot
   */
  createVersion(description?: string): OrganizationVersion {
    const agents = this.agentRegistry.getAllAgents('live');
    const playbooks = this.playbookEngine.getAllPlaybooks();

    const version: OrganizationVersion = {
      id: uuidv4(),
      version: this.generateVersionNumber(),
      timestamp: new Date(),
      agents: agents.map(a => a.id),
      playbooks: playbooks.map(p => p.id),
      capabilities: [], // Will be populated from capabilities registry
      snapshot: {
        description,
        agentCount: agents.length,
        playbookCount: playbooks.length,
        agents: agents.map(a => ({
          id: a.id,
          name: a.name,
          type: a.type,
          version: a.version,
          status: a.status,
        })),
        playbooks: playbooks.map(p => ({
          id: p.id,
          name: p.name,
          version: p.version,
          stepCount: p.steps.length,
        })),
      },
    };

    this.versions.push(version);
    this.currentVersion = version;

    return version;
  }

  /**
   * Get current organization version
   */
  getCurrentVersion(): OrganizationVersion | null {
    return this.currentVersion;
  }

  /**
   * Get version by ID
   */
  getVersion(id: string): OrganizationVersion | undefined {
    return this.versions.find(v => v.id === id);
  }

  /**
   * Get all versions
   */
  getAllVersions(): OrganizationVersion[] {
    return [...this.versions].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Get version history
   */
  getVersionHistory(limit?: number): OrganizationVersion[] {
    const history = this.getAllVersions();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Generate semantic version number
   */
  private generateVersionNumber(): string {
    const current = this.currentVersion?.version || '0.0.0';
    const parts = current.split('.').map(Number);
    
    // Increment patch version
    parts[2] = (parts[2] || 0) + 1;
    
    return parts.join('.');
  }

  /**
   * Generate major version
   */
  createMajorVersion(description?: string): OrganizationVersion {
    if (this.currentVersion) {
      const parts = this.currentVersion.version.split('.').map(Number);
      parts[0] = (parts[0] || 0) + 1;
      parts[1] = 0;
      parts[2] = 0;
      
      const version: OrganizationVersion = {
        ...this.createVersion(description),
        version: parts.join('.'),
      };
      
      this.currentVersion = version;
      return version;
    }
    
    return this.createVersion(description);
  }

  /**
   * Generate minor version
   */
  createMinorVersion(description?: string): OrganizationVersion {
    if (this.currentVersion) {
      const parts = this.currentVersion.version.split('.').map(Number);
      parts[1] = (parts[1] || 0) + 1;
      parts[2] = 0;
      
      const version: OrganizationVersion = {
        ...this.createVersion(description),
        version: parts.join('.'),
      };
      
      this.currentVersion = version;
      return version;
    }
    
    return this.createVersion(description);
  }
}