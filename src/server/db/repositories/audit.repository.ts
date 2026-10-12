/**
 * Audit Ledger Repository
 */

import { DatabaseConnection } from "../connection";
import { AuditLogEntity } from "../schema";

export class AuditRepository {
  constructor(private conn: DatabaseConnection) {}

  public findAll(limit = 100): AuditLogEntity[] {
    return this.conn.getSchema().tables.auditLogs.slice(-limit).reverse();
  }

  public getLatest(): AuditLogEntity | undefined {
    const list = this.conn.getSchema().tables.auditLogs;
    return list[list.length - 1];
  }

  public getCount(): number {
    return this.conn.getSchema().tables.auditLogs.length;
  }

  public async append(entry: AuditLogEntity): Promise<AuditLogEntity> {
    return this.conn.transaction((tables) => {
      tables.auditLogs.push(entry);
      if (tables.auditLogs.length > 5000) {
        tables.auditLogs.shift();
      }
      return entry;
    });
  }
}
