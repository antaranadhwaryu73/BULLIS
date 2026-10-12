/**
 * Institutional Tamper-Evident Cryptographic Audit Ledger
 * Every sensitive trading operation, risk breach, and config update is recorded
 * in a SHA-256 hash-chained Merkle-style sequence to satisfy regulatory compliance (SEBI/FINRA).
 */

import { sha256Hex } from "./auth";

export interface AuditLogEntry {
  index: number;
  timestamp: string;
  actorId: string;
  actorName: string;
  action: string;
  resource: string;
  clientIp: string;
  status: "SUCCESS" | "DENIED" | "FAILURE";
  details: Record<string, unknown>;
  previousHash: string;
  hash: string;
}

export class CryptographicAuditLedger {
  private entries: AuditLogEntry[] = [];
  private readonly maxCapacity = 2000;
  private genesisHash = "0000000000000000000000000000000000000000000000000000000000000000";
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(seedKernelInit = true) {
    if (seedKernelInit) {
      this.record({
        actorId: "system",
        actorName: "BULLIS Core Kernel",
        action: "KERNEL_INITIALIZATION",
        resource: "SYSTEM",
        clientIp: "127.0.0.1",
        status: "SUCCESS",
        details: { message: "Audit Ledger initialized with SHA-256 tamper-evident integrity" },
      });
    }
  }

  public record(params: {
    actorId: string;
    actorName: string;
    action: string;
    resource: string;
    clientIp: string;
    status: "SUCCESS" | "DENIED" | "FAILURE";
    details: Record<string, unknown>;
  }): Promise<AuditLogEntry> {
    const nextPromise = this.writeQueue.then(async () => {
      const lastEntry = this.entries[this.entries.length - 1];
      const previousHash = lastEntry ? lastEntry.hash : this.genesisHash;

      const index = this.entries.length;
      const timestamp = new Date().toISOString();

      const payloadToHash = JSON.stringify({
        index,
        timestamp,
        actorId: params.actorId,
        action: params.action,
        resource: params.resource,
        clientIp: params.clientIp,
        status: params.status,
        details: params.details,
        previousHash,
      });

      const hash = await sha256Hex(payloadToHash);

      const entry: AuditLogEntry = {
        index,
        timestamp,
        actorId: params.actorId,
        actorName: params.actorName,
        action: params.action,
        resource: params.resource,
        clientIp: params.clientIp,
        status: params.status,
        details: params.details,
        previousHash,
        hash,
      };

      if (this.entries.length >= this.maxCapacity) {
        this.entries.shift(); // Evict oldest
      }
      this.entries.push(entry);

      return entry;
    });

    this.writeQueue = nextPromise.catch(() => undefined);
    return nextPromise;
  }

  public async verifyIntegrity(): Promise<{ valid: boolean; brokenAtIndex?: number }> {
    await this.writeQueue;

    for (let i = 0; i < this.entries.length; i++) {
      const current = this.entries[i];
      if (!current) continue;
      const prevEntry = i === 0 ? null : this.entries[i - 1];
      const expectedPrevHash = i === 0 ? this.genesisHash : (prevEntry?.hash ?? "");

      if (current.previousHash !== expectedPrevHash) {
        return { valid: false, brokenAtIndex: i };
      }

      const payloadToHash = JSON.stringify({
        index: current.index,
        timestamp: current.timestamp,
        actorId: current.actorId,
        action: current.action,
        resource: current.resource,
        clientIp: current.clientIp,
        status: current.status,
        details: current.details,
        previousHash: current.previousHash,
      });

      const recalculateHash = await sha256Hex(payloadToHash);
      if (recalculateHash !== current.hash) {
        return { valid: false, brokenAtIndex: i };
      }
    }

    return { valid: true };
  }

  public getRecent(limit = 50): AuditLogEntry[] {
    return this.entries.slice(-limit).reverse();
  }

  public getCount(): number {
    return this.entries.length;
  }
}

export const auditLedger = new CryptographicAuditLedger();
