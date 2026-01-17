/**
 * Path Guard - Guarded filesystem for target repos
 * Enforces allowlist/denylist and prevents destructive operations
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface PathGuardConfig {
  repoPath: string;
  writeAllow: string[];
  writeDeny: string[];
}

export class PathGuard {
  private repoPath: string;
  private writeAllow: string[];
  private writeDeny: string[];

  constructor(config: PathGuardConfig) {
    this.repoPath = path.resolve(config.repoPath);
    this.writeAllow = config.writeAllow;
    this.writeDeny = config.writeDeny;
  }

  /**
   * Resolve and validate a path is within repoPath
   * Prevents ../ traversal attacks
   */
  private resolveSafePath(relativePath: string): string {
    const normalized = path.normalize(relativePath);
    
    if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
      throw new Error(`Path traversal not allowed: ${relativePath}`);
    }

    const absolutePath = path.resolve(this.repoPath, normalized);

    if (!absolutePath.startsWith(this.repoPath + path.sep) && absolutePath !== this.repoPath) {
      throw new Error(`Path escapes repository: ${relativePath}`);
    }

    return absolutePath;
  }

  /**
   * Get relative path from absolute path
   */
  private getRelativePath(absolutePath: string): string {
    return path.relative(this.repoPath, absolutePath);
  }

  /**
   * Check if a path matches any pattern in the list
   */
  private matchesPattern(relativePath: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (relativePath.startsWith(pattern)) {
        return true;
      }
      if (relativePath === pattern.replace(/\/$/, '')) {
        return true;
      }
      if (pattern.endsWith('/') && (relativePath + '/').startsWith(pattern)) {
        return true;
      }
      if (!pattern.endsWith('/') && relativePath === pattern) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if write is allowed for a path
   */
  private isWriteAllowed(relativePath: string): boolean {
    if (relativePath.startsWith('.git/') || relativePath === '.git') {
      return false;
    }

    if (this.matchesPattern(relativePath, this.writeDeny)) {
      return false;
    }

    return this.matchesPattern(relativePath, this.writeAllow);
  }

  /**
   * Read a file (always allowed within repo)
   */
  async readFile(relativePath: string): Promise<string> {
    const absolutePath = this.resolveSafePath(relativePath);
    return fs.readFile(absolutePath, 'utf8');
  }

  /**
   * Write a file (only if allowed by config)
   */
  async writeFile(relativePath: string, content: string): Promise<void> {
    const absolutePath = this.resolveSafePath(relativePath);
    const relPath = this.getRelativePath(absolutePath);

    if (!this.isWriteAllowed(relPath)) {
      throw new Error(`Write not allowed to path: ${relPath}`);
    }

    const dir = path.dirname(absolutePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(absolutePath, content, 'utf8');
  }

  /**
   * List files in a directory (always allowed within repo)
   */
  async listFiles(relativePath: string = '.'): Promise<string[]> {
    const absolutePath = this.resolveSafePath(relativePath);
    const entries = await fs.readdir(absolutePath, { withFileTypes: true });
    return entries.map(entry => entry.name + (entry.isDirectory() ? '/' : ''));
  }

  /**
   * Check if a path exists
   */
  async exists(relativePath: string): Promise<boolean> {
    try {
      const absolutePath = this.resolveSafePath(relativePath);
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete is NOT allowed in v0
   */
  async delete(_relativePath: string): Promise<never> {
    throw new Error('Delete operation not allowed in v0');
  }

  /**
   * Rename is NOT allowed in v0
   */
  async rename(_from: string, _to: string): Promise<never> {
    throw new Error('Rename operation not allowed in v0');
  }

  /**
   * Unlink is NOT allowed in v0
   */
  async unlink(_relativePath: string): Promise<never> {
    throw new Error('Unlink operation not allowed in v0');
  }

  /**
   * Get the repo path for cwd usage
   */
  getRepoPath(): string {
    return this.repoPath;
  }
}
