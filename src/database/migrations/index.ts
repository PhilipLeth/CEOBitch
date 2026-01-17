/**
 * Database Migrations Index
 */

import { Migration, migration001 } from './001_initial';

export { Migration } from './001_initial';

export const migrations: Migration[] = [migration001];

export const getCurrentVersion = (appliedMigrations: number[]): number => {
  return appliedMigrations.length > 0 ? Math.max(...appliedMigrations) : 0;
};

export const getPendingMigrations = (appliedVersions: number[]): Migration[] => {
  return migrations.filter((m) => !appliedVersions.includes(m.version));
};
