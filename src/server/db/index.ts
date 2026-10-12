/**
 * BULLIS Institutional Database Facade
 * Provides unified access to repositories, transactions, and persistence.
 */

import { dbConnection, DatabaseConnection } from "./connection";
import { ContractsRepository } from "./repositories/contracts.repository";
import { MarketQuotesRepository } from "./repositories/market-quotes.repository";
import { TradesRepository } from "./repositories/trades.repository";
import { AuditRepository } from "./repositories/audit.repository";
import { ApiKeysRepository } from "./repositories/api-keys.repository";
import { QuarantineRepository } from "./repositories/quarantine.repository";
import { seedDatabase } from "./seed";

export class Database {
  public readonly connection: DatabaseConnection;
  public readonly contracts: ContractsRepository;
  public readonly marketQuotes: MarketQuotesRepository;
  public readonly trades: TradesRepository;
  public readonly audit: AuditRepository;
  public readonly apiKeys: ApiKeysRepository;
  public readonly quarantine: QuarantineRepository;

  constructor(conn = dbConnection) {
    this.connection = conn;
    this.contracts = new ContractsRepository(conn);
    this.marketQuotes = new MarketQuotesRepository(conn);
    this.trades = new TradesRepository(conn);
    this.audit = new AuditRepository(conn);
    this.apiKeys = new ApiKeysRepository(conn);
    this.quarantine = new QuarantineRepository(conn);

    seedDatabase(conn).catch(console.error);
  }

  public getStats() {
    const schema = this.connection.getSchema();
    return {
      version: schema.version,
      lastSyncedAt: schema.lastSyncedAt,
      counts: {
        contracts: schema.tables.contracts.length,
        marketQuotes: schema.tables.marketQuotes.length,
        trades: schema.tables.trades.length,
        auditLogs: schema.tables.auditLogs.length,
        apiKeys: schema.tables.apiKeys.length,
        quarantine: schema.tables.quarantine.length,
      },
    };
  }
}

export const db = new Database();

export * from "./schema";
export * from "./connection";
export * from "./repositories/contracts.repository";
export * from "./repositories/market-quotes.repository";
export * from "./repositories/trades.repository";
export * from "./repositories/audit.repository";
export * from "./repositories/api-keys.repository";
export * from "./repositories/quarantine.repository";
export * from "./seed";
