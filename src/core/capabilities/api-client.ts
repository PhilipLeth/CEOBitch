/**
 * API Client Capability
 */

import { Capability } from '../../types';

interface ApiRequestParams {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export function createApiClientCapability(): Capability {
  return {
    id: 'api_request',
    name: 'API Request',
    description: 'Make HTTP requests to external APIs',
    action: async (params: unknown) => {
      const {
        url,
        method = 'GET',
        headers = {},
        body,
        timeout = 30000,
      } = params as ApiRequestParams;

      if (!url || typeof url !== 'string') {
        throw new Error('url is required and must be a string');
      }

      // Validate URL
      try {
        new URL(url);
      } catch {
        throw new Error('Invalid URL format');
      }

      // Setup timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type');
        let data: unknown;

        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        return {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        
        throw error;
      }
    },
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          default: 'GET',
        },
        headers: { type: 'object' },
        body: {},
        timeout: { type: 'number', default: 30000 },
      },
      required: ['url'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        status: { type: 'number' },
        statusText: { type: 'string' },
        headers: { type: 'object' },
        data: {},
      },
    },
    riskLevel: 'medium',
    resourceUsage: {
      maxNetworkCalls: 1,
    },
  };
}