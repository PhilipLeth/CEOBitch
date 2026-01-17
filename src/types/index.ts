/**
 * Core types for CEOBitch AI Organization System
 */

// Agent Types
export type AgentType = 'code' | 'analysis' | 'communication' | 'research' | 'execution' | 'custom';
export type AgentStatus = 'test' | 'staging' | 'live' | 'deprecated';
export type ExecutionStatus = 'success' | 'failed' | 'requires_approval';
export type ApprovalDecision = 'approved' | 'rejected' | 'requires_improvement';

// Agent Interface
export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  playbook: Playbook;
  responsibilityBounds: ResponsibilityBounds;
  version: string;
  status: AgentStatus;
  createdAt: Date;
  updatedAt: Date;
  capabilities: string[];
  metadata?: Record<string, unknown>;
}

// Responsibility Bounds - ensures agents don't exceed their responsibility
export interface ResponsibilityBounds {
  allowedActions: string[];
  forbiddenActions: string[];
  resourceLimits: ResourceLimits;
  timeLimit?: number; // in seconds
  scope: string[]; // domains/topics agent can work on
}

// Resource Limits
export interface ResourceLimits {
  maxMemoryMB?: number;
  maxCpuPercent?: number;
  maxNetworkCalls?: number;
  maxFileOperations?: number;
}

// Playbook Structure
export interface Playbook {
  id: string;
  name: string;
  description?: string;
  steps: PlaybookStep[];
  qualityCriteria: QualityCriteria;
  riskChecks: RiskCheck[];
  reportFormat: ReportFormat;
  version: string;
  createdAt: Date;
}

// Playbook Step
export interface PlaybookStep {
  id: string;
  name: string;
  action: string;
  inputs: Record<string, unknown>;
  outputs: string[];
  validation?: ValidationRule[];
  retryPolicy?: RetryPolicy;
}

// Validation Rule
export interface ValidationRule {
  type: 'schema' | 'custom' | 'regex';
  rule: unknown;
  errorMessage?: string;
}

// Retry Policy
export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  retryOn: string[]; // error types to retry on
}

// Quality Criteria
export interface QualityCriteria {
  minScore: number; // 0-100
  requiredFields: string[];
  formatRequirements?: Record<string, unknown>;
  contentRequirements?: string[];
}

// Risk Check
export interface RiskCheck {
  id: string;
  name: string;
  checkType: 'pattern' | 'heuristic' | 'ai-assessment' | 'custom';
  threshold: number;
  action: 'warn' | 'block' | 'require_approval';
  description: string;
}

// Report Format
export interface ReportFormat {
  structure: Record<string, unknown>;
  requiredSections: string[];
  metadata?: Record<string, unknown>;
}

// Execution Report
export interface ExecutionReport {
  id: string;
  agentId: string;
  orderId: string;
  status: ExecutionStatus;
  output: unknown;
  qualityScore?: number;
  riskAssessment?: RiskAssessment;
  logs: ExecutionLog[];
  timestamp: Date;
  executionTimeMs: number;
  environment: 'test' | 'staging' | 'live';
  metadata?: Record<string, unknown>;
}

// Risk Assessment
export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  recommendations?: string[];
  requiresHumanReview: boolean;
}

// Risk Factor
export interface RiskFactor {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence?: unknown;
}

// Execution Log
export interface ExecutionLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, unknown>;
}

// Owner Order
export interface OwnerOrder {
  id: string;
  description: string;
  deadline?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt?: Date;
  attemptCount: number;
  lastError?: string;
  nextAttemptAt?: number;
  lockedBy?: string;
  lockedUntil?: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
}

// Approval Record
export interface ApprovalRecord {
  id: string;
  reportId: string;
  decision: ApprovalDecision;
  decisionBy: string; // 'ceo-bitch' | 'human' | 'automated'
  timestamp: Date;
  feedback?: string;
  improvementRequirements?: string[];
}

// Capability Definition
export interface Capability {
  id: string;
  name: string;
  description: string;
  action: (params: unknown) => Promise<unknown>;
  inputSchema?: unknown;
  outputSchema?: unknown;
  requiresAuth?: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  resourceUsage?: ResourceLimits;
}

// Organization Version
export interface OrganizationVersion {
  id: string;
  version: string;
  timestamp: Date;
  agents: string[]; // agent IDs
  playbooks: string[]; // playbook IDs
  capabilities: string[]; // capability IDs
  snapshot: Record<string, unknown>;
}

// AI Provider Config
export interface AIProviderConfig {
  provider: 'openai' | 'anthropic' | 'custom';
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

// Execution Context
export interface ExecutionContext {
  agentId: string;
  orderId: string;
  environment: 'test' | 'staging' | 'live';
  capabilities: Map<string, Capability>;
  logger: Logger;
  stopSignal?: AbortSignal;
}

// Logger Interface
export interface Logger {
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
}