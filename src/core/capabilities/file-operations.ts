/**
 * File Operations Capability
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Capability } from '../../types';

interface FileReadParams {
  filePath: string;
  encoding?: BufferEncoding;
}

interface FileWriteParams {
  filePath: string;
  content: string;
  encoding?: BufferEncoding;
}

interface FileListParams {
  directoryPath: string;
  recursive?: boolean;
}

export function createFileOperationsCapability(): Capability {
  return {
    id: 'read_file',
    name: 'Read File',
    description: 'Read content from a file',
    action: async (params: unknown) => {
      const { filePath, encoding = 'utf-8' } = params as FileReadParams;
      
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('filePath is required and must be a string');
      }

      // Security: prevent path traversal
      const normalizedPath = path.normalize(filePath);
      if (normalizedPath.includes('..')) {
        throw new Error('Path traversal detected');
      }

      const content = await fs.readFile(normalizedPath, encoding);
      return { content, filePath: normalizedPath };
    },
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        encoding: { type: 'string', default: 'utf-8' },
      },
      required: ['filePath'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        filePath: { type: 'string' },
      },
    },
    riskLevel: 'low',
    resourceUsage: {
      maxFileOperations: 1,
    },
  };
}

export function createFileWriteCapability(): Capability {
  return {
    id: 'write_file',
    name: 'Write File',
    description: 'Write content to a file',
    action: async (params: unknown) => {
      const { filePath, content, encoding = 'utf-8' } = params as FileWriteParams;
      
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('filePath is required and must be a string');
      }

      if (content === undefined) {
        throw new Error('content is required');
      }

      // Security: prevent path traversal
      const normalizedPath = path.normalize(filePath);
      if (normalizedPath.includes('..')) {
        throw new Error('Path traversal detected');
      }

      // Create directory if it doesn't exist
      const dir = path.dirname(normalizedPath);
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(normalizedPath, String(content), encoding);
      return { filePath: normalizedPath, success: true };
    },
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        content: { type: 'string' },
        encoding: { type: 'string', default: 'utf-8' },
      },
      required: ['filePath', 'content'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        success: { type: 'boolean' },
      },
    },
    riskLevel: 'medium',
    resourceUsage: {
      maxFileOperations: 1,
    },
  };
}

export function createFileListCapability(): Capability {
  return {
    id: 'list_files',
    name: 'List Files',
    description: 'List files in a directory',
    action: async (params: unknown) => {
      const { directoryPath, recursive = false } = params as FileListParams;
      
      if (!directoryPath || typeof directoryPath !== 'string') {
        throw new Error('directoryPath is required and must be a string');
      }

      // Security: prevent path traversal
      const normalizedPath = path.normalize(directoryPath);
      if (normalizedPath.includes('..')) {
        throw new Error('Path traversal detected');
      }

      const files: string[] = [];

      async function listRecursive(dir: string, baseDir: string): Promise<void> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(baseDir, fullPath);
          
          if (entry.isDirectory() && recursive) {
            await listRecursive(fullPath, baseDir);
          } else {
            files.push(relativePath);
          }
        }
      }

      await listRecursive(normalizedPath, normalizedPath);
      return { files, directoryPath: normalizedPath };
    },
    inputSchema: {
      type: 'object',
      properties: {
        directoryPath: { type: 'string' },
        recursive: { type: 'boolean', default: false },
      },
      required: ['directoryPath'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string' } },
        directoryPath: { type: 'string' },
      },
    },
    riskLevel: 'low',
    resourceUsage: {
      maxFileOperations: 1,
    },
  };
}