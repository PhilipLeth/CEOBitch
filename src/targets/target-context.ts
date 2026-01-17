/**
 * Target Context - Runtime context for target repo operations
 */

import { TargetConfig, loadTarget } from './target-loader';
import { PathGuard } from './path-guard';
import { CommandRunner } from './command-runner';

export interface SmokeCheckResult {
  url: string;
  success: boolean;
  statusCode?: number;
  error?: string;
}

export class TargetContext {
  private config: TargetConfig;
  private pathGuard: PathGuard;
  private commandRunner: CommandRunner;

  private constructor(config: TargetConfig) {
    this.config = config;
    this.pathGuard = new PathGuard({
      repoPath: config.repoPath,
      writeAllow: config.writeAllow,
      writeDeny: config.writeDeny,
    });
    this.commandRunner = new CommandRunner(config.repoPath);
  }

  /**
   * Create a target context by loading config by name
   */
  static async create(targetName: string): Promise<TargetContext> {
    const config = await loadTarget(targetName);
    return new TargetContext(config);
  }

  /**
   * Get the working directory (repoPath)
   */
  getCwd(): string {
    return this.config.repoPath;
  }

  /**
   * Get the guarded filesystem
   */
  getFs(): PathGuard {
    return this.pathGuard;
  }

  /**
   * Get the command runner
   */
  getCommandRunner(): CommandRunner {
    return this.commandRunner;
  }

  /**
   * Get target config
   */
  getConfig(): TargetConfig {
    return this.config;
  }

  /**
   * Run verify commands from config
   */
  async runVerify(): Promise<{ success: boolean; results: Array<{ command: string; exitCode: number; stdout: string; stderr: string }> }> {
    const results: Array<{ command: string; exitCode: number; stdout: string; stderr: string }> = [];
    let success = true;

    for (const cmd of this.config.verify) {
      const result = await this.commandRunner.run(cmd);
      results.push({
        command: cmd,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
      });

      if (result.exitCode !== 0) {
        success = false;
        break;
      }
    }

    return { success, results };
  }

  /**
   * Run smoke checks from config (HTTP GET only)
   */
  async runSmokeChecks(): Promise<{ success: boolean; results: SmokeCheckResult[] }> {
    const results: SmokeCheckResult[] = [];
    let success = true;

    for (const checkPath of this.config.smoke.checks) {
      const url = `${this.config.smoke.baseUrl}${checkPath}`;
      
      try {
        const response = await fetch(url, { method: 'GET' });
        const checkSuccess = response.ok;
        
        results.push({
          url,
          success: checkSuccess,
          statusCode: response.status,
        });

        if (!checkSuccess) {
          success = false;
        }
      } catch (error) {
        results.push({
          url,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
        success = false;
      }
    }

    return { success, results };
  }
}
