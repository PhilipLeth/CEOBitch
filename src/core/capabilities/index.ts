/**
 * Capabilities - initialize and register all capabilities
 */

import { CapabilityRegistry } from './capability-registry';
import {
  createFileOperationsCapability,
  createFileWriteCapability,
  createFileListCapability,
} from './file-operations';
import { createApiClientCapability } from './api-client';

/**
 * Initialize all built-in capabilities
 */
export function initializeCapabilities(): CapabilityRegistry {
  const registry = new CapabilityRegistry();

  // Register file operations
  registry.registerCapability(createFileOperationsCapability());
  registry.registerCapability(createFileWriteCapability());
  registry.registerCapability(createFileListCapability());

  // Register API client
  registry.registerCapability(createApiClientCapability());

  return registry;
}

export { CapabilityRegistry } from './capability-registry';