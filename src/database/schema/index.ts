/**
 * Database Schema Definitions
 * Lokation: src/database/schema/
 */

import {
  Agent,
  Playbook,
  OwnerOrder,
  ExecutionReport,
  ApprovalRecord,
  OrganizationVersion,
  Capability,
} from '../../types';

export interface AgentRecord extends Omit<Agent, 'playbook' | 'createdAt' | 'updatedAt'> {
  playbookId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaybookRecord extends Omit<Playbook, 'createdAt'> {
  createdAt: string;
}

export interface OrderRecord extends Omit<OwnerOrder, 'createdAt' | 'deadline' | 'updatedAt'> {
  createdAt: string;
  deadline?: string;
  updatedAt?: string;
}

export interface ExecutionRecord extends Omit<ExecutionReport, 'timestamp'> {
  timestamp: string;
}

export interface ApprovalRecordSchema extends Omit<ApprovalRecord, 'timestamp'> {
  timestamp: string;
}

export interface OrganizationVersionRecord extends Omit<OrganizationVersion, 'timestamp'> {
  timestamp: string;
}

export interface CapabilityRecord extends Omit<Capability, 'action'> {
  actionName: string;
}

export interface DatabaseSchema {
  agents: AgentRecord[];
  playbooks: PlaybookRecord[];
  orders: OrderRecord[];
  executions: ExecutionRecord[];
  reports: ExecutionRecord[];
  approvals: ApprovalRecordSchema[];
  organization_versions: OrganizationVersionRecord[];
  capabilities: CapabilityRecord[];
}

export const createEmptySchema = (): DatabaseSchema => ({
  agents: [],
  playbooks: [],
  orders: [],
  executions: [],
  reports: [],
  approvals: [],
  organization_versions: [],
  capabilities: [],
});
