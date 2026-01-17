/**
 * Capability Registry - manages shared capabilities for all agents
 */

import { Capability } from '../../types';

export class CapabilityRegistry {
  private capabilities: Map<string, Capability> = new Map();

  /**
   * Register a capability
   */
  registerCapability(capability: Capability): void {
    if (this.capabilities.has(capability.id)) {
      throw new Error(`Capability ${capability.id} already registered`);
    }

    this.capabilities.set(capability.id, capability);
  }

  /**
   * Get capability by ID
   */
  getCapability(id: string): Capability | undefined {
    return this.capabilities.get(id);
  }

  /**
   * Get capability by name
   */
  getCapabilityByName(name: string): Capability | undefined {
    for (const capability of this.capabilities.values()) {
      if (capability.name === name) {
        return capability;
      }
    }
    return undefined;
  }

  /**
   * Get all capabilities
   */
  getAllCapabilities(): Capability[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Get capabilities by risk level
   */
  getCapabilitiesByRiskLevel(riskLevel: Capability['riskLevel']): Capability[] {
    return Array.from(this.capabilities.values()).filter(
      c => c.riskLevel === riskLevel
    );
  }

  /**
   * Check if capability exists
   */
  hasCapability(id: string): boolean {
    return this.capabilities.has(id);
  }

  /**
   * Unregister capability
   */
  unregisterCapability(id: string): boolean {
    return this.capabilities.delete(id);
  }

  /**
   * Get capabilities map for agent use
   */
  getCapabilitiesMap(): Map<string, Capability> {
    return new Map(this.capabilities);
  }
}