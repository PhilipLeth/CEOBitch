/**
 * Logger - centralized logging system
 */

import winston from 'winston';
import { Logger } from '../../types';
import { config } from '../../config';
import * as fs from 'fs';
import * as path from 'path';

let loggerInstance: winston.Logger | null = null;

/**
 * Initialize logger
 */
export function initializeLogger(): winston.Logger {
  if (loggerInstance) {
    return loggerInstance;
  }

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...metadata }) => {
          const metaStr = Object.keys(metadata).length ? JSON.stringify(metadata) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      ),
    }),
  ];

  // File logging if enabled
  if (config.logging.enableFileLogging && config.logging.logDirectory) {
    const logDir = config.logging.logDirectory;
    
    // Create log directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      })
    );
  }

  loggerInstance = winston.createLogger({
    level: config.logging.level,
    transports,
  });

  return loggerInstance;
}

/**
 * Get logger instance
 */
export function getLogger(): winston.Logger {
  if (!loggerInstance) {
    return initializeLogger();
  }
  return loggerInstance;
}

/**
 * Create Logger interface implementation
 */
export function createLogger(): Logger {
  const winstonLogger = getLogger();
  
  return {
    debug: (message: string, metadata?: Record<string, unknown>) => {
      winstonLogger.debug(message, metadata);
    },
    info: (message: string, metadata?: Record<string, unknown>) => {
      winstonLogger.info(message, metadata);
    },
    warn: (message: string, metadata?: Record<string, unknown>) => {
      winstonLogger.warn(message, metadata);
    },
    error: (message: string, metadata?: Record<string, unknown>) => {
      winstonLogger.error(message, metadata);
    },
  };
}