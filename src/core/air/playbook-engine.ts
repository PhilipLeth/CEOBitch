/**
 * Playbook Engine - manages playbook definitions and execution flows
 */

import { v4 as uuidv4 } from 'uuid';
import { Playbook } from '../../types';

export class PlaybookEngine {
  private playbooks: Map<string, Playbook> = new Map();
  private playbooksByName: Map<string, Playbook[]> = new Map();

  /**
   * Register a playbook
   */
  registerPlaybook(playbook: Omit<Playbook, 'id' | 'createdAt'>): Playbook {
    const existing = this.findPlaybookByName(playbook.name, playbook.version);
    
    if (existing) {
      // Update existing
      const updated: Playbook = {
        ...existing,
        ...playbook,
      };
      this.playbooks.set(updated.id, updated);
      this.updateNameIndex(updated);
      return updated;
    }

    // Create new
    const newPlaybook: Playbook = {
      ...playbook,
      id: uuidv4(),
      createdAt: new Date(),
    };

    this.playbooks.set(newPlaybook.id, newPlaybook);
    this.updateNameIndex(newPlaybook);
    
    return newPlaybook;
  }

  /**
   * Get playbook by ID
   */
  getPlaybook(id: string): Playbook | undefined {
    return this.playbooks.get(id);
  }

  /**
   * Find playbook by name and optionally version
   */
  findPlaybookByName(name: string, version?: string): Playbook | undefined {
    const candidates = this.playbooksByName.get(name) || [];
    
    if (version) {
      return candidates.find(p => p.version === version);
    }
    
    // Return latest version
    if (candidates.length > 0) {
      return candidates.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
    }
    
    return undefined;
  }

  /**
   * Get all playbooks
   */
  getAllPlaybooks(): Playbook[] {
    return Array.from(this.playbooks.values());
  }

  /**
   * Validate playbook structure
   */
  validatePlaybook(playbook: Playbook): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!playbook.name || playbook.name.trim().length === 0) {
      errors.push('Playbook name is required');
    }

    if (!playbook.steps || playbook.steps.length === 0) {
      errors.push('Playbook must have at least one step');
    }

    if (!playbook.qualityCriteria) {
      errors.push('Playbook must have quality criteria');
    }

    if (!playbook.riskChecks || playbook.riskChecks.length === 0) {
      errors.push('Playbook must have at least one risk check');
    }

    // Validate steps
    playbook.steps.forEach((step, index) => {
      if (!step.id) {
        errors.push(`Step ${index + 1} must have an ID`);
      }
      if (!step.action) {
        errors.push(`Step ${index + 1} must have an action`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create a step ID if missing
   */
  ensureStepIds(playbook: Playbook): Playbook {
    const steps = playbook.steps.map((step, index) => ({
      ...step,
      id: step.id || `step-${index + 1}`,
    }));

    return {
      ...playbook,
      steps,
    };
  }

  /**
   * Update name index
   */
  private updateNameIndex(playbook: Playbook): void {
    const existing = this.playbooksByName.get(playbook.name) || [];
    const index = existing.findIndex(p => p.id === playbook.id);
    
    if (index >= 0) {
      existing[index] = playbook;
    } else {
      existing.push(playbook);
    }
    
    this.playbooksByName.set(playbook.name, existing);
  }
}