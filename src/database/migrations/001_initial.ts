/**
 * Initial Migration - sets up base database structure
 */

import { DatabaseSchema, createEmptySchema } from '../schema';

export interface Migration {
  version: number;
  name: string;
  up: (schema: DatabaseSchema) => DatabaseSchema;
  down: (schema: DatabaseSchema) => DatabaseSchema;
}

export const migration001: Migration = {
  version: 1,
  name: 'initial',
  up: (_schema: DatabaseSchema): DatabaseSchema => {
    return createEmptySchema();
  },
  down: (_schema: DatabaseSchema): DatabaseSchema => {
    return createEmptySchema();
  },
};
