/**
 * Trades Repository
 */

import { DatabaseConnection } from "../connection";
import { TradeEntity } from "../schema";

export class TradesRepository {
  constructor(private conn: DatabaseConnection) {}

  public findAll(limit = 100): TradeEntity[] {
    return this.conn.getSchema().tables.trades.slice(-limit).reverse();
  }

  public async insertTrade(trade: TradeEntity): Promise<TradeEntity> {
    return this.conn.transaction((tables) => {
      tables.trades.push(trade);
      return trade;
    });
  }

  public async insertBatch(trades: TradeEntity[]): Promise<TradeEntity[]> {
    return this.conn.transaction((tables) => {
      tables.trades.push(...trades);
      return trades;
    });
  }
}
