/**
 * Quarantine Repository
 */

import { DatabaseConnection } from "../connection";
import { QuarantineEntity } from "../schema";

export class QuarantineRepository {
  constructor(private conn: DatabaseConnection) {}

  public findAll(limit = 100): QuarantineEntity[] {
    return this.conn.getSchema().tables.quarantine.slice(-limit).reverse();
  }

  public async insert(entry: QuarantineEntity): Promise<QuarantineEntity> {
    return this.conn.transaction((tables) => {
      tables.quarantine.unshift(entry);
      if (tables.quarantine.length > 1000) {
        tables.quarantine.pop();
      }
      return entry;
    });
  }
}
