/**
 * Command Runner - Execute commands in target repo context
 */

import { exec, ExecOptions } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

export interface CommandRunnerOptions {
  timeoutMs?: number;
  env?: Record<string, string>;
}

const DEFAULT_TIMEOUT_MS = 60000;

export class CommandRunner {
  constructor(private cwd: string) {}

  /**
   * Run a command in the target repo directory
   */
  async run(command: string, options: CommandRunnerOptions = {}): Promise<CommandResult> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const execOptions: ExecOptions = {
      cwd: this.cwd,
      timeout: timeoutMs,
      env: {
        ...process.env,
        ...options.env,
      },
      maxBuffer: 10 * 1024 * 1024,
    };

    try {
      const { stdout, stderr } = await execAsync(command, execOptions);
      return {
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        exitCode: 0,
        timedOut: false,
      };
    } catch (error) {
      const err = error as { code?: number; killed?: boolean; stdout?: string; stderr?: string; signal?: string };
      
      const timedOut = err.killed === true || err.signal === 'SIGTERM';
      
      return {
        stdout: err.stdout?.toString() ?? '',
        stderr: err.stderr?.toString() ?? '',
        exitCode: typeof err.code === 'number' ? err.code : 1,
        timedOut,
      };
    }
  }

  /**
   * Run multiple commands in sequence
   */
  async runAll(commands: string[], options: CommandRunnerOptions = {}): Promise<CommandResult[]> {
    const results: CommandResult[] = [];
    
    for (const cmd of commands) {
      const result = await this.run(cmd, options);
      results.push(result);
      
      if (result.exitCode !== 0) {
        break;
      }
    }
    
    return results;
  }

  /**
   * Get the working directory
   */
  getCwd(): string {
    return this.cwd;
  }
}
