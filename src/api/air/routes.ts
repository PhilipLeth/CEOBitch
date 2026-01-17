/**
 * AIR API Routes - Agent Intelligence Runtime internal API
 */

import { Router, Request, Response } from 'express';
import { Agent, Playbook, AgentType, AgentStatus } from '../../types';
import { AIR } from '../../core/air';
import { createLogger } from '../../core/monitoring';

export function createAIRRoutes(air: AIR): Router {
  const router = Router();
  const logger = createLogger();

  /**
   * Register a new agent
   * POST /api/air/agents
   */
  router.post('/agents', (req: Request, res: Response) => {
    try {
      const agentData = req.body as Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>;

      if (!agentData.name || !agentData.type) {
        return res.status(400).json({ error: 'Agent name and type are required' });
      }

      const agent = air.registerAgent(agentData);

      logger.info('Agent registered via API', {
        agentId: agent.id,
        agentName: agent.name,
      });

      return res.status(201).json(agent);
    } catch (error) {
      logger.error('Error registering agent', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        error: 'Failed to register agent',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * Get agent by ID
   * GET /api/air/agents/:id
   */
  router.get('/agents/:id', (req: Request, res: Response) => {
    const agent = air.getAgent(req.params.id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    return res.json(agent);
  });

  /**
   * Get all agents
   * GET /api/air/agents
   */
  router.get('/agents', (req: Request, res: Response) => {
    const status = req.query.status as AgentStatus | undefined;
    const type = req.query.type as AgentType | undefined;

    let agents = air.getAllAgents(status);

    if (type) {
      agents = agents.filter((a) => a.type === type);
    }

    res.json({ agents });
  });

  /**
   * Update agent status
   * PATCH /api/air/agents/:id/status
   */
  router.patch('/agents/:id/status', (req: Request, res: Response) => {
    try {
      const { status } = req.body as { status: AgentStatus };

      if (!status || !['test', 'staging', 'live', 'deprecated'].includes(status)) {
        return res.status(400).json({ error: 'Valid status is required' });
      }

      const success = air.updateAgentStatus(req.params.id, status);

      if (!success) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      logger.info('Agent status updated via API', {
        agentId: req.params.id,
        newStatus: status,
      });

      return res.json({ success: true, newStatus: status });
    } catch (error) {
      logger.error('Error updating agent status', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        error: 'Failed to update agent status',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * Register a playbook
   * POST /api/air/playbooks
   */
  router.post('/playbooks', (req: Request, res: Response) => {
    try {
      const playbook = req.body as Playbook;

      if (!playbook.name || !playbook.steps) {
        return res.status(400).json({ error: 'Playbook name and steps are required' });
      }

      const registered = air.registerPlaybook(playbook);

      logger.info('Playbook registered via API', {
        playbookId: registered.id,
        playbookName: registered.name,
      });

      return res.status(201).json(registered);
    } catch (error) {
      logger.error('Error registering playbook', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        error: 'Failed to register playbook',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * Get all playbooks
   * GET /api/air/playbooks
   */
  router.get('/playbooks', (_req: Request, res: Response) => {
    const playbooks = air.getAllPlaybooks();
    res.json({ playbooks });
  });

  /**
   * Get organization version
   * GET /api/air/organization/version
   */
  router.get('/organization/version', (_req: Request, res: Response) => {
    const version = air.getCurrentOrganizationVersion();
    res.json(version);
  });

  /**
   * Create organization snapshot
   * POST /api/air/organization/snapshot
   */
  router.post('/organization/snapshot', (_req: Request, res: Response) => {
    try {
      const snapshot = air.createOrganizationSnapshot();

      logger.info('Organization snapshot created via API', {
        version: snapshot.version,
      });

      res.status(201).json(snapshot);
    } catch (error) {
      logger.error('Error creating organization snapshot', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: 'Failed to create organization snapshot',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return router;
}
