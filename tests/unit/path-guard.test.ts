/**
 * Unit tests for PathGuard
 */

import { PathGuard } from '../../src/targets/path-guard';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('PathGuard', () => {
  let testDir: string;
  let guard: PathGuard;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pathguard-test-'));
    await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'docs'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.git'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'deploy'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'src', 'test.ts'), 'test content');
    await fs.writeFile(path.join(testDir, '.env'), 'SECRET=test');

    guard = new PathGuard({
      repoPath: testDir,
      writeAllow: ['src/', 'docs/'],
      writeDeny: ['.git/', 'deploy/', '.env'],
    });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('readFile', () => {
    it('should read files within repo', async () => {
      const content = await guard.readFile('src/test.ts');
      expect(content).toBe('test content');
    });

    it('should block path traversal', async () => {
      await expect(guard.readFile('../../../etc/passwd')).rejects.toThrow('Path traversal not allowed');
    });
  });

  describe('writeFile', () => {
    it('should write files in allowed paths', async () => {
      await guard.writeFile('src/new-file.ts', 'new content');
      const content = await fs.readFile(path.join(testDir, 'src', 'new-file.ts'), 'utf8');
      expect(content).toBe('new content');
    });

    it('should block writing outside allowlist', async () => {
      await expect(guard.writeFile('config/secret.json', 'data')).rejects.toThrow('Write not allowed');
    });

    it('should block writing to .git/', async () => {
      await expect(guard.writeFile('.git/config', 'data')).rejects.toThrow('Write not allowed');
    });

    it('should block writing to denied paths', async () => {
      await expect(guard.writeFile('deploy/script.sh', 'data')).rejects.toThrow('Write not allowed');
    });

    it('should block writing to .env', async () => {
      await expect(guard.writeFile('.env', 'SECRET=hacked')).rejects.toThrow('Write not allowed');
    });

    it('should block path traversal on write', async () => {
      await expect(guard.writeFile('../../../tmp/evil', 'data')).rejects.toThrow('Path traversal not allowed');
    });
  });

  describe('destructive operations', () => {
    it('should block delete', async () => {
      await expect(guard.delete('src/test.ts')).rejects.toThrow('Delete operation not allowed in v0');
    });

    it('should block rename', async () => {
      await expect(guard.rename('src/test.ts', 'src/renamed.ts')).rejects.toThrow('Rename operation not allowed in v0');
    });

    it('should block unlink', async () => {
      await expect(guard.unlink('src/test.ts')).rejects.toThrow('Unlink operation not allowed in v0');
    });
  });

  describe('listFiles', () => {
    it('should list files in directory', async () => {
      const files = await guard.listFiles('src');
      expect(files).toContain('test.ts');
    });
  });

  describe('exists', () => {
    it('should return true for existing files', async () => {
      const exists = await guard.exists('src/test.ts');
      expect(exists).toBe(true);
    });

    it('should return false for non-existing files', async () => {
      const exists = await guard.exists('src/nonexistent.ts');
      expect(exists).toBe(false);
    });
  });
});
