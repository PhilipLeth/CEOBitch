/**
 * Autonomous Order Flow - fully autonomous execution via Ralph and Amp
 * No human intervention required
 */

import { OwnerOrder, ExecutionReport, Agent, Playbook } from '../types';
import { AIR } from '../core/air';
import { ExecutionSandbox } from '../core/agents/execution-sandbox';
import { CEOBitch } from '../core/ceo-bitch';
import { CapabilityRegistry } from '../core/capabilities';
import { createLogger } from '../core/monitoring';
import { metricsCollector } from '../core/monitoring';
import { GitGateway } from '../core/autonomous/git-gateway';
import { RalphIntegration } from '../core/autonomous/ralph-integration';
import { AmpIntegration } from '../core/autonomous/amp-integration';
import { promises as fs } from 'fs';
import path from 'path';

interface AutonomousOrderResult {
  orderId: string;
  report: ExecutionReport;
  approved: boolean;
  gitCommit?: string;
  ampReview?: {
    approved: boolean;
    confidence: number;
  };
  deployed: boolean;
}

export class AutonomousOrderFlow {
  private gitGateway: GitGateway;
  private ralph: RalphIntegration;
  private amp: AmpIntegration;

  constructor(
    private air: AIR,
    private _sandbox: ExecutionSandbox,
    private ceoBitch: CEOBitch,
    private _capabilities: CapabilityRegistry,
    private logger = createLogger()
  ) {
    // Properties prefixed with _ are intentionally unused for future implementation
    void this._sandbox;
    void this._capabilities;
    this.gitGateway = new GitGateway();
    this.ralph = new RalphIntegration(this.gitGateway);
    this.amp = new AmpIntegration(this.gitGateway);
  }

  /**
   * Execute order fully autonomously
   * 1. Ralph orchestrates the execution (continuous loop until complete)
   * 2. Amp reviews the code (agentic code review)
   * 3. CEO Bitch does quality check
   * 4. Everything goes through git before production
   */
  async executeOrder(order: OwnerOrder): Promise<AutonomousOrderResult> {
    const agentType = this.ceoBitch.selectAgentTypeForOrder(order);
    this.logger.info(`Starting autonomous order flow for ${order.id}`, {
      orderId: order.id,
      agentType,
    });

    try {
      // Step 1: Ralph orchestrates the task
      const ralphTask = await this.ralph.executeTask(order);

      if (ralphTask.status === 'failed') {
        throw new Error(`Ralph orchestration failed: ${ralphTask.error}`);
      }

      // Step 2: Get or create agent
      let agent = this.air.routeOrder(order);
      if (!agent) {
        // Generate playbook using Amp if needed
        const playbookCode = await this.amp.generateCode(
          `Create playbook for: ${order.description}`,
          { agentType, order }
        );

        // Execute agent creation (would use generated code)
        const playbook = this.parsePlaybookFromAmp(playbookCode);
        agent = await this.air.ensureAgentForOrder(order, agentType, playbook);
      }

      // Step 3: Execute in staging
      const report = await this.executeInStaging(order, agent);

      // Step 4: Amp reviews the code
      const ampReview = await this.amp.reviewCode(report);

      // Step 5: CEO Bitch review (using Amp feedback)
      const qualityCriteria = agent.playbook.qualityCriteria;
      
      // Adjust quality criteria based on Amp review
      if (!ampReview.approved) {
        qualityCriteria.minScore = Math.max(qualityCriteria.minScore, 85);
      }

      const approvalResult = await this.ceoBitch.reviewReport(
        report,
        qualityCriteria,
        agent.playbook.riskChecks,
        // Auto-approve if both Amp and CEO Bitch agree (high confidence)
        ampReview.approved && ampReview.confidence > 0.85
          ? 'approved'
          : undefined
      );

      // Step 6: Record metrics
      metricsCollector.recordExecution(report);
      metricsCollector.recordApproval(report.id, approvalResult.decision === 'approved');

      // Step 7: Commit to git (required for production)
      let gitCommit: string | undefined;
      if (approvalResult.decision === 'approved') {
        const commit = await this.gitGateway.ensureCommitted(
          [],
          `Autonomous execution: ${order.description}`
        );
        gitCommit = commit.hash;

        // Push to remote (triggers deployment via GitHub Actions)
        const isProd = await this.gitGateway.isProductionBranch();
        if (isProd) {
          await this.gitGateway.pushToRemote();
          this.logger.info('Pushed to production branch, deployment will trigger', {
            commit: gitCommit,
          });
        }
      }

      const result: AutonomousOrderResult = {
        orderId: order.id,
        report,
        approved: approvalResult.decision === 'approved',
        gitCommit,
        ampReview: {
          approved: ampReview.approved,
          confidence: ampReview.confidence,
        },
        deployed: approvalResult.decision === 'approved' && gitCommit !== undefined,
      };

      this.logger.info(`Autonomous order flow completed for ${order.id}`, {
        orderId: order.id,
        approved: result.approved,
        deployed: result.deployed,
        gitCommit: result.gitCommit,
      });

      return result;
    } catch (error) {
      this.logger.error(`Autonomous order flow failed for ${order.id}`, {
        orderId: order.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute agent work in staging
   */
  private async executeInStaging(order: OwnerOrder, agent: Agent): Promise<ExecutionReport> {
    // Use BaseAgent or similar execution mechanism
    // This is simplified - actual implementation would use the agent system
    const createdFiles = await this.createLandingPageIfRequested(order);

    const report: ExecutionReport = {
      id: `exec-${order.id}`,
      agentId: agent.id,
      orderId: order.id,
      status: 'requires_approval',
      output: {
        success: true,
        orderId: order.id,
        files: createdFiles,
      },
      logs: [
        {
          timestamp: new Date(),
          level: 'info',
          message: `Execution started for order: ${order.description}`,
        },
      ],
      timestamp: new Date(),
      executionTimeMs: 1000,
      environment: 'staging',
    };

    return report;
  }

  private async createLandingPageIfRequested(order: OwnerOrder): Promise<string[]> {
    const description = order.description.toLowerCase();
    const shouldCreateLandingPage =
      description.includes('landing page') || description.includes('landingpage');

    if (!shouldCreateLandingPage) {
      return [];
    }

    const filePath = path.resolve(process.cwd(), 'public', 'landing-page.html');
    const html = `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CEOBitch</title>
</head>
<body>
  <main>
    <h1>CEOBitch</h1>
    <p>Kaos nedenunder. Disciplin ovenpå.</p>
  </main>
</body>
</html>
`;

    // Minimal, deterministic output for autonomous orders
    await fs.writeFile(filePath, html, 'utf8');
    this.logger.info('Landing page created', {
      orderId: order.id,
      filePath,
    });

    return ['public/landing-page.html'];
  }

  /**
   * Parse playbook from Amp code generation
   */
  private parsePlaybookFromAmp(_ampCode: { code: string; files: string[] }): Playbook {
    // In production, this would parse the generated code
    // For now, return default playbook structure
    return {
      id: `playbook-${Date.now()}`,
      name: 'Generated Playbook',
      version: '1.0.0',
      steps: [
        {
          id: 'step-1',
          name: 'Execute task',
          action: 'read_file',
          inputs: {},
          outputs: ['result'],
        },
      ],
      qualityCriteria: {
        minScore: 70,
        requiredFields: ['result'],
      },
      riskChecks: [
        {
          id: 'risk-1',
          name: 'Error Check',
          checkType: 'pattern',
          threshold: 0.5,
          action: 'require_approval' as const,
          description: 'Check for errors',
        },
      ],
      reportFormat: {
        structure: {},
        requiredSections: ['result'],
      },
      createdAt: new Date(),
    };
  }
}