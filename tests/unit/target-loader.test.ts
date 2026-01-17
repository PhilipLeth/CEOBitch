/**
 * Unit tests for TargetLoader
 */

import { loadTarget, listTargets, TargetLoadError } from '../../src/targets/target-loader';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('TargetLoader', () => {
  const originalCwd = process.cwd();
  let testDir: string;
  let targetsDir: string;
  let testRepoDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'targetloader-test-'));
    targetsDir = path.join(testDir, 'targets');
    testRepoDir = path.join(testDir, 'test-repo');
    
    await fs.mkdir(targetsDir, { recursive: true });
    await fs.mkdir(testRepoDir, { recursive: true });
    
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('loadTarget', () => {
    it('should load valid target config', async () => {
      const config = {
        name: 'test-target',
        repoPath: testRepoDir,
        writeAllow: ['src/'],
        writeDeny: ['.git/'],
        verify: ['npm run lint'],
        smoke: {
          baseUrl: 'http://localhost:3000',
          checks: ['/'],
        },
      };
      
      await fs.writeFile(
        path.join(targetsDir, 'test-target.json'),
        JSON.stringify(config)
      );

      const loaded = await loadTarget('test-target');
      
      expect(loaded.name).toBe('test-target');
      expect(loaded.repoPath).toBe(testRepoDir);
      expect(loaded.writeAllow).toContain('src/');
    });

    it('should reject missing config file', async () => {
      await expect(loadTarget('nonexistent')).rejects.toThrow(TargetLoadError);
      await expect(loadTarget('nonexistent')).rejects.toThrow('not found');
    });

    it('should reject invalid JSON', async () => {
      await fs.writeFile(
        path.join(targetsDir, 'invalid.json'),
        'not valid json {'
      );

      await expect(loadTarget('invalid')).rejects.toThrow(TargetLoadError);
      await expect(loadTarget('invalid')).rejects.toThrow('Invalid JSON');
    });

    it('should reject missing required fields', async () => {
      await fs.writeFile(
        path.join(targetsDir, 'incomplete.json'),
        JSON.stringify({ name: 'incomplete' })
      );

      await expect(loadTarget('incomplete')).rejects.toThrow(TargetLoadError);
      await expect(loadTarget('incomplete')).rejects.toThrow('missing field');
    });

    it('should reject non-existent repoPath', async () => {
      const config = {
        name: 'bad-path',
        repoPath: '/nonexistent/path/12345',
        writeAllow: ['src/'],
        writeDeny: ['.git/'],
        verify: [],
        smoke: { baseUrl: 'http://localhost', checks: [] },
      };
      
      await fs.writeFile(
        path.join(targetsDir, 'bad-path.json'),
        JSON.stringify(config)
      );

      await expect(loadTarget('bad-path')).rejects.toThrow(TargetLoadError);
      await expect(loadTarget('bad-path')).rejects.toThrow('does not exist');
    });
  });

  describe('listTargets', () => {
    it('should list available targets', async () => {
      await fs.writeFile(
        path.join(targetsDir, 'target1.json'),
        JSON.stringify({ name: 'target1' })
      );
      await fs.writeFile(
        path.join(targetsDir, 'target2.json'),
        JSON.stringify({ name: 'target2' })
      );

      const targets = await listTargets();
      
      expect(targets).toContain('target1');
      expect(targets).toContain('target2');
    });

    it('should return empty array if no targets exist', async () => {
      await fs.rm(targetsDir, { recursive: true });
      const targets = await listTargets();
      expect(targets).toEqual([]);
    });
  });
});
