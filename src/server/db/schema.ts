/**
 * Institutional Commodity Derivatives Database Schema
 * Defines typed entities, relational tables, constraints, and audit requirements.
 */

import { ContractId } from "../domain/types";
import { Role } from "../security/auth";

export interface ContractEntity {
  id: ContractId;
  name: string;
  tradingUnit: string;
  quoteBasis: string;
  q: number;
  purity: number;
  tickSize: number;
  lotSize: number;
  listingDate: string;
  lastTradingDate: string;
  tenderStart: string;
  deliveryDate: string;
  specVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketQuoteEntity {
  id: string; // `${contractId}_${timestamp}`
  contractId: ContractId;
  timestamp: string;
  lastPrice: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  openInterest: number;
  bid: number;
  ask: number;
  bidQty: number;
  askQty: number;
  normalizedPrice: number;
  status: "SAFE" | "WATCH" | "RESTRICTED";
  daysToExpiry: number;
  isInTenderWindow: boolean;
  createdAt: string;
}

export interface TradeEntity {
  id: string;
  date: string;
  pair: string;
  side: "LONG_SPREAD" | "SHORT_SPREAD";
  entryZ: number;
  exitZ: number;
  holdingDays: number;
  grossPnL: number;
  fees: number;
  slippage: number;
  netPnL: number;
  exitReason: "MEAN_REVERSION" | "STOP_LOSS" | "TIME_STOP" | "TENDER_BUFFER";
  phase: "IN_SAMPLE" | "OUT_OF_SAMPLE" | "HOLDOUT";
  createdAt: string;
}

export interface AuditLogEntity {
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

export interface ApiKeyEntity {
  keyId: string;
  keyPrefix: string;
  keyHash: string;
  name: string;
  role: Role;
  permissions: string[];
  createdAt: number;
  lastUsedAt?: number;
}

export interface QuarantineEntity {
  id: string;
  timestamp: string;
  code: string;
  severity: "High" | "Medium" | "Low";
  row: string;
  reason: string;
  action:
    "Quarantined" | "Deduplicated" | "Ignored (mapped)" | "Rejected" | "Resolved via trade date";
  resolvedAt?: string;
}

export interface BullisDatabaseSchema {
  version: number;
  lastSyncedAt: string;
  tables: {
    contracts: ContractEntity[];
    marketQuotes: MarketQuoteEntity[];
    trades: TradeEntity[];
    auditLogs: AuditLogEntity[];
    apiKeys: ApiKeyEntity[];
    quarantine: QuarantineEntity[];
  };
}
