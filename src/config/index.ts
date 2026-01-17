/**
 * Configuration management
 */

import { AIProviderConfig } from '../types';

export interface AppConfig {
  port: number;
  aiProviders: AIProviderConfig[];
  defaultAIProvider: string;
  qualityStandards: {
    minQualityScore: number;
    requireHumanApprovalForHighRisk: boolean;
    autoApproveLowRisk: boolean;
  };
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  executionLimits: {
    defaultTimeoutSeconds: number;
    maxMemoryMB: number;
    maxCpuPercent: number;
    maxConcurrentExecutions: number;
  };
  organization: {
    versioningEnabled: boolean;
    autoVersioning: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableFileLogging: boolean;
    logDirectory?: string;
  };
}

// Load configuration from environment variables
export function loadConfig(): AppConfig {
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    aiProviders: loadAIProviders(),
    defaultAIProvider: process.env.DEFAULT_AI_PROVIDER || 'openai',
    qualityStandards: {
      minQualityScore: parseInt(process.env.MIN_QUALITY_SCORE || '70', 10),
      requireHumanApprovalForHighRisk:
        process.env.REQUIRE_HUMAN_APPROVAL_FOR_HIGH_RISK !== 'false',
      autoApproveLowRisk: process.env.AUTO_APPROVE_LOW_RISK === 'true',
    },
    riskThresholds: {
      low: parseFloat(process.env.RISK_THRESHOLD_LOW || '0.3'),
      medium: parseFloat(process.env.RISK_THRESHOLD_MEDIUM || '0.5'),
      high: parseFloat(process.env.RISK_THRESHOLD_HIGH || '0.7'),
      critical: parseFloat(process.env.RISK_THRESHOLD_CRITICAL || '0.9'),
    },
    executionLimits: {
      defaultTimeoutSeconds: parseInt(
        process.env.DEFAULT_TIMEOUT_SECONDS || '300',
        10
      ),
      maxMemoryMB: parseInt(process.env.MAX_MEMORY_MB || '512', 10),
      maxCpuPercent: parseInt(process.env.MAX_CPU_PERCENT || '50', 10),
      maxConcurrentExecutions: parseInt(
        process.env.MAX_CONCURRENT_EXECUTIONS || '10',
        10
      ),
    },
    organization: {
      versioningEnabled: process.env.VERSIONING_ENABLED !== 'false',
      autoVersioning: process.env.AUTO_VERSIONING === 'true',
    },
    logging: {
      level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
      enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
      logDirectory: process.env.LOG_DIRECTORY || './logs',
    },
  };
}

function loadAIProviders(): AIProviderConfig[] {
  const providers: AIProviderConfig[] = [];

  // OpenAI
  if (process.env.OPENAI_API_KEY) {
    providers.push({
      provider: 'openai',
      model: process.env.OPENAI_MODEL || 'gpt-4',
      apiKey: process.env.OPENAI_API_KEY,
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000', 10),
      timeout: parseInt(process.env.OPENAI_TIMEOUT || '60000', 10),
    });
  }

  // Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    providers.push({
      provider: 'anthropic',
      model: process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229',
      apiKey: process.env.ANTHROPIC_API_KEY,
      temperature: parseFloat(process.env.ANTHROPIC_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '2000', 10),
      timeout: parseInt(process.env.ANTHROPIC_TIMEOUT || '60000', 10),
    });
  }

  return providers;
}

// Export singleton config instance
export const config = loadConfig();