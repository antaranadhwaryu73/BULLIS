/**
 * API Keys Repository
 */

import { DatabaseConnection } from "../connection";
import { ApiKeyEntity } from "../schema";

export class ApiKeysRepository {
  constructor(private conn: DatabaseConnection) {}

  public findAll(): ApiKeyEntity[] {
    return this.conn.getSchema().tables.apiKeys;
  }

  public findByHash(hash: string): ApiKeyEntity | undefined {
    return this.conn.getSchema().tables.apiKeys.find((k) => k.keyHash === hash);
  }

  public async upsert(key: ApiKeyEntity): Promise<ApiKeyEntity> {
    return this.conn.transaction((tables) => {
      const idx = tables.apiKeys.findIndex((k) => k.keyHash === key.keyHash);
      if (idx >= 0) {
        tables.apiKeys[idx] = key;
        return key;
      }
      tables.apiKeys.push(key);
      return key;
    });
  }

  public async recordUsage(hash: string): Promise<void> {
    return this.conn.transaction((tables) => {
      const found = tables.apiKeys.find((k) => k.keyHash === hash);
      if (found) {
        found.lastUsedAt = Date.now();
      }
    });
  }
}
