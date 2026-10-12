/**
 * BULLIS Institutional API Client
 * Enterprise HTTP transport with correlation ID propagation, API key auth,
 * exponential backoff retries, and strongly typed response unwrapping.
 */

import {
  ContractSpecification,
  MarketQuote,
  PairSpreadAnalysis,
  AnomalyReport,
  BacktestParams,
  BacktestResult,
  RiskRadarState,
  ContractId,
} from "../server/domain/types";
import { TermStructurePoint } from "../server/domain/pricing-engine";
import {
  PipelineStage,
  ValidationErrorItem,
  RawBhavcopyRecord,
} from "../server/domain/data-pipeline";
import { AuditLogEntry } from "../server/security/audit-logger";

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly detail: string;

  constructor(status: number, code: string, detail: string) {
    super(`[API ${status} ${code}] ${detail}`);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

class InstitutionalApiClient {
  private baseUrl = "";
  private apiKey = "bullis_quant_institutional_demo_key_2026";

  private async request<T>(endpoint: string, options: RequestInit = {}, retries = 2): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const correlationId = `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

    const headers = new Headers(options.headers);
    if (!headers.has("Content-Type") && options.body) {
      headers.set("Content-Type", "application/json");
    }
    headers.set("x-bullis-api-key", this.apiKey);
    headers.set("x-request-id", correlationId);

    try {
      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        let errBody: { title?: string; detail?: string; error?: string } = {};
        try {
          errBody = await response.json();
        } catch {
          // ignore parsing error
        }
        const code = errBody.title || errBody.error || "HTTP_ERROR";
        const detail = errBody.detail || response.statusText;
        throw new ApiError(response.status, code, detail);
      }

      return (await response.json()) as T;
    } catch (err) {
      if (retries > 0 && !(err instanceof ApiError && err.status < 500)) {
        await new Promise((r) => setTimeout(r, 300));
        return this.request<T>(endpoint, options, retries - 1);
      }
      throw err;
    }
  }

  // System & Health
  public async getHealth() {
    return this.request<{
      status: string;
      version: string;
      uptimeSeconds: number;
      latencyMs: number;
      memory: { heapUsedMB: number; rssMB: number };
      subsystems: Record<string, { status: string }>;
    }>("/api/v1/health");
  }

  public async getDbStats() {
    const res = await this.request<{
      data: {
        version: number;
        lastSyncedAt: string;
        counts: Record<string, number>;
      };
    }>("/api/v1/db/stats");
    return res.data;
  }

  // Contracts & Market Quotes
  public async getContracts() {
    const res = await this.request<{
      data: {
        spec: ContractSpecification;
        quote: MarketQuote;
      }[];
    }>("/api/v1/contracts");
    return res.data.map((item) => ({
      ...item.spec,
      rawPrice: item.quote.lastPrice,
      normalizedPrice: item.quote.normalizedPrice,
      volume: item.quote.volume,
      oi: item.quote.openInterest,
      status: item.quote.status,
      daysToExpiry: item.quote.daysToExpiry,
    }));
  }

  public async getContract(id: ContractId) {
    return this.request<{
      spec: ContractSpecification;
      quote: MarketQuote;
    }>(`/api/v1/contracts/${id}`);
  }

  // Pricing & Curves
  public async getTermStructure() {
    const res = await this.request<{ data: TermStructurePoint[] }>(
      "/api/v1/pricing/term-structure",
    );
    return res.data;
  }

  public async getPairs() {
    const res = await this.request<{ data: PairSpreadAnalysis[] }>("/api/v1/pricing/pairs");
    return res.data;
  }

  public async getFairValue(dte = 30, spot = 76200) {
    return this.request<{
      spot: number;
      daysToExpiry: number;
      fairValue: number;
      impliedCarryPct: number;
    }>(`/api/v1/pricing/fair-value?dte=${dte}&spot=${spot}`);
  }

  // Anomalies
  public async getAnomalies(contractId: ContractId = "GOLDM") {
    const res = await this.request<{ data: AnomalyReport }>(
      `/api/v1/anomalies?contract=${contractId}`,
    );
    return res.data;
  }

  // Simulation & Backtest
  public async runBacktest(params: BacktestParams) {
    const res = await this.request<{ data: BacktestResult }>("/api/v1/simulator/backtest", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return res.data;
  }

  public async getFriction(notional = 765000, slippageTicks = 1) {
    const res = await this.request<{
      data: {
        exchangeCharges: number;
        ctt: number;
        stampDuty: number;
        sebiCharges: number;
        gst: number;
        slippageCost: number;
        totalFriction: number;
      };
    }>(`/api/v1/simulator/friction?notional=${notional}&slippage=${slippageTicks}`);
    return res.data;
  }

  // Risk Radar
  public async getRiskRadar(notional = 2500000) {
    const res = await this.request<{ data: RiskRadarState }>(
      `/api/v1/risk/radar?notional=${notional}`,
    );
    return res.data;
  }

  // Data Pipeline
  public async getPipelineStages() {
    const res = await this.request<{ data: PipelineStage[] }>("/api/v1/pipeline/stages");
    return res.data;
  }

  public async getQuarantine() {
    const res = await this.request<{ data: ValidationErrorItem[] }>("/api/v1/pipeline/quarantine");
    return res.data;
  }

  public async ingestRecord(record: RawBhavcopyRecord) {
    return this.request<{ success: boolean; quarantined: boolean; message: string }>(
      "/api/v1/pipeline/ingest",
      {
        method: "POST",
        body: JSON.stringify(record),
      },
    );
  }

  // Audit Ledger
  public async getAuditLogs(limit = 50) {
    const res = await this.request<{ count: number; data: AuditLogEntry[] }>(
      `/api/v1/audit/logs?limit=${limit}`,
    );
    return res.data;
  }

  public async verifyAuditChain() {
    const res = await this.request<{
      valid: boolean;
      totalVerified: number;
      timestamp: string;
      brokenAtIndex?: number;
    }>("/api/v1/audit/verify");
    return {
      verified: res.valid,
      recordCount: res.totalVerified,
      timestamp: res.timestamp,
    };
  }
}

export const api = new InstitutionalApiClient();
