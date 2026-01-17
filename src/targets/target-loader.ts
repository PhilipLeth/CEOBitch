/**
 * Target Loader - Load and validate target configurations
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface TargetConfig {
  name: string;
  repoPath: string;
  writeAllow: string[];
  writeDeny: string[];
  verify: string[];
  smoke: {
    baseUrl: string;
    checks: string[];
  };
}

const REQUIRED_FIELDS = ['name', 'repoPath', 'writeAllow', 'writeDeny', 'verify', 'smoke'] as const;

export class TargetLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TargetLoadError';
  }
}

/**
 * Validate target config has required fields
 */
function validateConfig(config: unknown, targetName: string): asserts config is TargetConfig {
  if (typeof config !== 'object' || config === null) {
    throw new TargetLoadError(`Invalid target config for ${targetName}: not an object`);
  }

  const obj = config as Record<string, unknown>;

  for (const field of REQUIRED_FIELDS) {
    if (!(field in obj)) {
      throw new TargetLoadError(`Invalid target config for ${targetName}: missing field "${field}"`);
    }
  }

  if (typeof obj.name !== 'string') {
    throw new TargetLoadError(`Invalid target config for ${targetName}: "name" must be a string`);
  }

  if (typeof obj.repoPath !== 'string') {
    throw new TargetLoadError(`Invalid target config for ${targetName}: "repoPath" must be a string`);
  }

  if (!Array.isArray(obj.writeAllow)) {
    throw new TargetLoadError(`Invalid target config for ${targetName}: "writeAllow" must be an array`);
  }

  if (!Array.isArray(obj.writeDeny)) {
    throw new TargetLoadError(`Invalid target config for ${targetName}: "writeDeny" must be an array`);
  }

  if (!Array.isArray(obj.verify)) {
    throw new TargetLoadError(`Invalid target config for ${targetName}: "verify" must be an array`);
  }

  if (typeof obj.smoke !== 'object' || obj.smoke === null) {
    throw new TargetLoadError(`Invalid target config for ${targetName}: "smoke" must be an object`);
  }

  const smoke = obj.smoke as Record<string, unknown>;
  if (typeof smoke.baseUrl !== 'string') {
    throw new TargetLoadError(`Invalid target config for ${targetName}: "smoke.baseUrl" must be a string`);
  }

  if (!Array.isArray(smoke.checks)) {
    throw new TargetLoadError(`Invalid target config for ${targetName}: "smoke.checks" must be an array`);
  }
}

/**
 * Get path to targets directory
 */
function getTargetsDir(): string {
  return path.resolve(process.cwd(), 'targets');
}

/**
 * Load a target configuration by name
 */
export async function loadTarget(name: string): Promise<TargetConfig> {
  const targetsDir = getTargetsDir();
  const configPath = path.join(targetsDir, `${name}.json`);

  let content: string;
  try {
    content = await fs.readFile(configPath, 'utf8');
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      throw new TargetLoadError(`Target config not found: ${name} (looked in ${configPath})`);
    }
    throw new TargetLoadError(`Failed to read target config ${name}: ${err.message}`);
  }

  let config: unknown;
  try {
    config = JSON.parse(content);
  } catch {
    throw new TargetLoadError(`Invalid JSON in target config: ${name}`);
  }

  validateConfig(config, name);

  try {
    await fs.access(config.repoPath);
  } catch {
    throw new TargetLoadError(`Target repoPath does not exist: ${config.repoPath}`);
  }

  return config;
}

/**
 * List available target names
 */
export async function listTargets(): Promise<string[]> {
  const targetsDir = getTargetsDir();
  
  try {
    const files = await fs.readdir(targetsDir);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace(/\.json$/, ''));
  } catch {
    return [];
  }
}
