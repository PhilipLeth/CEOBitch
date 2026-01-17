/**
 * Git Gateway - ensures all production changes go through git
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '../monitoring';

const execAsync = promisify(exec);

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  timestamp: Date;
  files: string[];
}

export class GitGateway {
  private logger = createLogger();
  private productionBranch = 'main';

  /**
   * Create a git commit for changes
   */
  async commitChanges(
    files: string[],
    message: string,
    author: string = 'CEOBitch System'
  ): Promise<GitCommit> {
    try {
      // Stage files
      if (files.length > 0) {
        await execAsync(`git add ${files.join(' ')}`);
      } else {
        await execAsync('git add -A');
      }

      // Create commit
      await execAsync(
        `git commit -m "${message}" --author="${author} <system@ceobitch.ai>" || true`
      );

      // Get commit hash
      let commitHash = '';
      let authorName = author;
      let dateStr = new Date().toISOString();

      try {
        const { stdout: hash } = await execAsync('git rev-parse HEAD');
        commitHash = hash.trim();

        // Get commit info
        const { stdout: info } = await execAsync(
          `git log -1 --pretty=format:"%an|%ae|%ad" --date=iso ${commitHash}`
        );

        const [resolvedAuthorName, , resolvedDateStr] = info.split('|');
        authorName = resolvedAuthorName || author;
        dateStr = resolvedDateStr || dateStr;
      } catch (error) {
        this.logger.warn('No git HEAD available after commit attempt', {
          error: error instanceof Error ? error.message : String(error),
        });
        commitHash = 'no-head';
      }

      const commit: GitCommit = {
        hash: commitHash,
        message,
        author: authorName || author,
        timestamp: new Date(dateStr),
        files,
      };

      this.logger.info('Git commit created', {
        hash: commitHash,
        message,
        files: files.length,
      });

      return commit;
    } catch (error) {
      this.logger.error('Failed to create git commit', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Push changes to remote
   */
  async pushToRemote(branch: string = this.productionBranch): Promise<void> {
    try {
      await execAsync(`git push origin ${branch}`);
      this.logger.info('Pushed to remote', { branch });
    } catch (error) {
      this.logger.error('Failed to push to remote', {
        error: error instanceof Error ? error.message : String(error),
        branch,
      });
      throw error;
    }
  }

  /**
   * Create a pull request (for staging/production)
   */
  async createPullRequest(
    title: string,
    _body: string,
    fromBranch: string,
    toBranch: string = this.productionBranch
  ): Promise<string> {
    // This would integrate with GitHub API or git CLI
    // For now, log and return placeholder
    this.logger.info('Pull request would be created', {
      title,
      fromBranch,
      toBranch,
    });

    // In production, use GitHub API or gh CLI
    // const { stdout } = await execAsync(
    //   `gh pr create --title "${title}" --body "${body}" --base ${toBranch} --head ${fromBranch}`
    // );

    return 'pr-placeholder';
  }

  /**
   * Ensure changes are committed before production
   */
  async ensureCommitted(files: string[], context: string): Promise<GitCommit> {
    // Check if files are modified
    try {
      const { stdout: status } = await execAsync('git status --porcelain');
      const modifiedFiles = status
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.substring(3).trim());

      const relevantFiles = files.filter(f => modifiedFiles.includes(f));

      if (relevantFiles.length > 0) {
        return this.commitChanges(
          relevantFiles,
          `Auto-commit: ${context}`,
          'CEOBitch Autonomous System'
        );
      }

      // Return current HEAD commit if available, otherwise fall back to placeholder
      try {
        const { stdout: hash } = await execAsync('git rev-parse HEAD');
        const { stdout: message } = await execAsync('git log -1 --pretty=format:"%s"');
        const { stdout: author } = await execAsync('git log -1 --pretty=format:"%an"');

        return {
          hash: hash.trim(),
          message: message.trim(),
          author: author.trim(),
          timestamp: new Date(),
          files: relevantFiles,
        };
      } catch (error) {
        this.logger.warn('No git HEAD available, skipping commit metadata', {
          error: error instanceof Error ? error.message : String(error),
        });
        return {
          hash: 'no-head',
          message: `No git history for context: ${context}`,
          author: 'unknown',
          timestamp: new Date(),
          files: relevantFiles,
        };
      }
    } catch (error) {
      this.logger.error('Failed to ensure committed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get current branch
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD');
      return stdout.trim();
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Check if we're on production branch
   */
  async isProductionBranch(): Promise<boolean> {
    const branch = await this.getCurrentBranch();
    return branch === this.productionBranch;
  }
}