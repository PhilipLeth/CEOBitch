/**
 * Unit tests for CommandRunner
 */

import { CommandRunner } from '../../src/targets/command-runner';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('CommandRunner', () => {
  let testDir: string;
  let runner: CommandRunner;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmdrunner-test-'));
    await fs.writeFile(path.join(testDir, 'test-file.txt'), 'test content');
    runner = new CommandRunner(testDir);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('run', () => {
    it('should execute command with cwd set to target repo', async () => {
      const result = await runner.run('cat test-file.txt');
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('test content');
    });

    it('should capture stdout', async () => {
      const result = await runner.run('echo hello');
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('hello');
    });

    it('should capture stderr', async () => {
      const result = await runner.run('ls nonexistent-file-12345');
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toBeTruthy();
    });

    it('should list files in target repo', async () => {
      const result = await runner.run('ls');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('test-file.txt');
    });

    it('should return non-zero exit code for failed commands', async () => {
      const result = await runner.run('exit 42');
      expect(result.exitCode).toBe(42);
    });

    it('should timeout long-running commands', async () => {
      const result = await runner.run('sleep 10', { timeoutMs: 100 });
      expect(result.timedOut).toBe(true);
    });
  });

  describe('runAll', () => {
    it('should run multiple commands in sequence', async () => {
      const results = await runner.runAll(['echo first', 'echo second']);
      expect(results).toHaveLength(2);
      expect(results[0].stdout.trim()).toBe('first');
      expect(results[1].stdout.trim()).toBe('second');
    });

    it('should stop on first failure', async () => {
      const results = await runner.runAll(['echo ok', 'exit 1', 'echo never']);
      expect(results).toHaveLength(2);
      expect(results[0].exitCode).toBe(0);
      expect(results[1].exitCode).toBe(1);
    });
  });

  describe('getCwd', () => {
    it('should return the configured cwd', () => {
      expect(runner.getCwd()).toBe(testDir);
    });
  });
});
