import { promises as fs } from 'fs';
import path from 'path';
import { OwnerOrder, ExecutionReport } from '../../types';

export type OrderExecutionResult = {
  approved: boolean;
  report?: ExecutionReport;
  approvalRecordId?: string;
  gitCommit?: string;
  deployed?: boolean;
};

type StoreData = {
  orders: Record<string, OwnerOrder>;
  reports: Record<string, OrderExecutionResult>;
};

const defaultData: StoreData = { orders: {}, reports: {} };

export class OrderStore {
  private filePath: string;
  private lockPath: string;

  constructor(dataDir: string = path.resolve(process.cwd(), 'data')) {
    this.filePath = path.join(dataDir, 'orders.json');
    this.lockPath = path.join(dataDir, 'orders.lock');
  }

  async init(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch {
      await fs.writeFile(this.filePath, JSON.stringify(defaultData, null, 2), 'utf8');
    }
  }

  async createOrder(order: OwnerOrder): Promise<void> {
    await this.withLock(async data => {
      data.orders[order.id] = order;
      return data;
    });
  }

  async updateOrder(order: OwnerOrder): Promise<void> {
    await this.withLock(async data => {
      data.orders[order.id] = order;
      return data;
    });
  }

  async getOrder(orderId: string): Promise<OwnerOrder | undefined> {
    const data = await this.readData();
    return data.orders[orderId];
  }

  async listOrders(): Promise<OwnerOrder[]> {
    const data = await this.readData();
    return Object.values(data.orders);
  }

  async setReport(orderId: string, report: OrderExecutionResult): Promise<void> {
    await this.withLock(async data => {
      data.reports[orderId] = report;
      return data;
    });
  }

  async getReport(orderId: string): Promise<OrderExecutionResult | undefined> {
    const data = await this.readData();
    return data.reports[orderId];
  }

  async findReportByReportId(reportId: string): Promise<{ orderId: string; report: OrderExecutionResult } | null> {
    const data = await this.readData();
    for (const [orderId, report] of Object.entries(data.reports)) {
      if (report.report?.id === reportId) {
        return { orderId, report };
      }
    }
    return null;
  }

  async getDueOrders(now: number): Promise<OwnerOrder[]> {
    const data = await this.readData();
    return Object.values(data.orders).filter(order => {
      if (order.status === 'completed') {
        return false;
      }
      if (order.status === 'in_progress') {
        return false;
      }
      const nextAttemptAt = order.nextAttemptAt ?? 0;
      return nextAttemptAt <= now && this.isLeaseExpired(order, now);
    });
  }

  async acquireLease(orderId: string, lockedBy: string, leaseMs: number, now: number): Promise<OwnerOrder | null> {
    let acquired = false;
    await this.withLock(async data => {
      const order = data.orders[orderId];
      if (!order) {
        return data;
      }

      if (!this.isLeaseExpired(order, now)) {
        return data;
      }

      if (order.status === 'completed') {
        return data;
      }

      const updated: OwnerOrder = {
        ...order,
        status: 'in_progress',
        lockedBy,
        lockedUntil: now + leaseMs,
        updatedAt: new Date(),
      };

      data.orders[orderId] = updated;
      acquired = true;
      return data;
    });

    if (!acquired) {
      return null;
    }

    return (await this.getOrder(orderId)) ?? null;
  }

  async releaseLease(orderId: string): Promise<void> {
    await this.withLock(async data => {
      const order = data.orders[orderId];
      if (!order) {
        return data;
      }
      data.orders[orderId] = {
        ...order,
        lockedBy: undefined,
        lockedUntil: undefined,
        updatedAt: new Date(),
      };
      return data;
    });
  }

  private isLeaseExpired(order: OwnerOrder, now: number): boolean {
    return !order.lockedUntil || order.lockedUntil <= now;
  }

  private async readData(): Promise<StoreData> {
    const raw = await fs.readFile(this.filePath, 'utf8');
    return JSON.parse(raw) as StoreData;
  }

  private async writeData(data: StoreData): Promise<void> {
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  private async withLock<T>(fn: (data: StoreData) => Promise<StoreData>): Promise<T> {
    await this.acquireFileLock();
    try {
      const data = await this.readData();
      const updated = await fn(data);
      await this.writeData(updated);
      return updated as unknown as T;
    } finally {
      await this.releaseFileLock();
    }
  }

  private async acquireFileLock(): Promise<void> {
    const start = Date.now();
    const timeoutMs = 5000;

    let acquired = false;
    while (!acquired) {
      try {
        const handle = await fs.open(this.lockPath, 'wx');
        await handle.close();
        acquired = true;
        return;
      } catch {
        if (Date.now() - start > timeoutMs) {
          throw new Error('Order store lock timeout');
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }

  private async releaseFileLock(): Promise<void> {
    try {
      await fs.unlink(this.lockPath);
    } catch {
      // Ignore unlock errors
    }
  }
}
