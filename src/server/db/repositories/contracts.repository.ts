/**
 * Contracts Repository
 */

import { DatabaseConnection } from "../connection";
import { ContractEntity } from "../schema";
import { ContractId } from "../../domain/types";

export class ContractsRepository {
  constructor(private conn: DatabaseConnection) {}

  public findAll(): ContractEntity[] {
    return this.conn.getSchema().tables.contracts;
  }

  public findById(id: ContractId): ContractEntity | undefined {
    return this.conn.getSchema().tables.contracts.find((c) => c.id === id);
  }

  public async upsert(contract: ContractEntity): Promise<ContractEntity> {
    return this.conn.transaction((tables) => {
      const idx = tables.contracts.findIndex((c) => c.id === contract.id);
      if (idx >= 0) {
        tables.contracts[idx] = { ...contract, updatedAt: new Date().toISOString() };
        return tables.contracts[idx];
      }
      tables.contracts.push(contract);
      return contract;
    });
  }
}
