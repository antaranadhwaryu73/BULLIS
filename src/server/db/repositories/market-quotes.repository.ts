/**
 * Market Quotes Repository
 */

import { DatabaseConnection } from "../connection";
import { MarketQuoteEntity } from "../schema";
import { ContractId } from "../../domain/types";

export class MarketQuotesRepository {
  constructor(private conn: DatabaseConnection) {}

  public findLatestByContract(contractId: ContractId): MarketQuoteEntity | undefined {
    const list = this.conn
      .getSchema()
      .tables.marketQuotes.filter((q) => q.contractId === contractId);
    return list[list.length - 1];
  }

  public findLatestAll(): MarketQuoteEntity[] {
    const contractIds: ContractId[] = ["GOLD", "GOLDM", "GOLDTEN", "GOLDGUINEA", "GOLDPETAL"];
    return contractIds
      .map((id) => this.findLatestByContract(id))
      .filter((q): q is MarketQuoteEntity => q !== undefined);
  }

  public async insertQuote(quote: MarketQuoteEntity): Promise<MarketQuoteEntity> {
    return this.conn.transaction((tables) => {
      tables.marketQuotes.push(quote);
      // Retain last 5000 quotes in memory/disk to bound memory growth
      if (tables.marketQuotes.length > 5000) {
        tables.marketQuotes.shift();
      }
      return quote;
    });
  }

  public async updateLatestQuote(
    contractId: ContractId,
    patch: Partial<MarketQuoteEntity>,
  ): Promise<MarketQuoteEntity> {
    return this.conn.transaction((tables) => {
      const list = tables.marketQuotes.filter((q) => q.contractId === contractId);
      const latest = list[list.length - 1];
      if (!latest) throw new Error(`No quote found for contract: ${contractId}`);

      Object.assign(latest, patch);
      latest.timestamp = new Date().toISOString();
      return latest;
    });
  }
}
