/**
 * MCX Bhavcopy Data Operations & Mark Validation Pipeline
 * Ingestion orchestrator, schema integrity validator, and quarantine ledger.
 */

export interface PipelineStage {
  id: string;
  stage: string;
  status: "ok" | "warn" | "fail" | "running";
  meta: string;
  latencyMs: number;
}

export interface ValidationErrorItem {
  id: string;
  timestamp: string;
  code: string;
  severity: "High" | "Medium" | "Low";
  row: string;
  reason: string;
  action:
    "Quarantined" | "Deduplicated" | "Ignored (mapped)" | "Rejected" | "Resolved via trade date";
}

export interface RawBhavcopyRecord {
  symbol: string;
  expiry: string;
  open: number;
  high: number;
  low: number;
  close: number;
  settlePrice: number;
  volume: number;
  openInterest: number;
  timestamp: string;
}

export class MCXDataPipelineManager {
  private stages: PipelineStage[] = [
    { id: "s1", stage: "MCX Bhavcopy", status: "ok", meta: "HTTP 200 · 1.2 MB", latencyMs: 240 },
    { id: "s2", stage: "Raw Artifact", status: "ok", meta: "sha256 stored", latencyMs: 12 },
    { id: "s3", stage: "Parser", status: "ok", meta: "v3.4.1 streaming", latencyMs: 38 },
    {
      id: "s4",
      stage: "Schema Validation",
      status: "warn",
      meta: "2 warnings quarantined",
      latencyMs: 19,
    },
    {
      id: "s5",
      stage: "Contract Master",
      status: "ok",
      meta: "5 matched active specs",
      latencyMs: 8,
    },
    { id: "s6", stage: "Normalization", status: "ok", meta: "MCX 2026.2 fineness", latencyMs: 14 },
    {
      id: "s7",
      stage: "Analytics Engine",
      status: "ok",
      meta: "residuals & z-scores 142ms",
      latencyMs: 142,
    },
    {
      id: "s8",
      stage: "Terminal Publisher",
      status: "ok",
      meta: "in-memory quote cache published",
      latencyMs: 5,
    },
  ];

  private quarantineRecords: ValidationErrorItem[] = [
    {
      id: "err-01",
      timestamp: "2026-10-12T09:15:00Z",
      code: "SUSPICIOUS OHLC",
      severity: "Medium",
      row: "GOLDPETAL · 26 SEP",
      reason: "High < Close by ₹2 — likely rounding discrepancy in source feed",
      action: "Quarantined",
    },
    {
      id: "err-02",
      timestamp: "2026-10-12T09:15:02Z",
      code: "SCHEMA DRIFT",
      severity: "Low",
      row: "Header row",
      reason: "New optional column 'OPTION_TYP' appeared in futures feed",
      action: "Ignored (mapped)",
    },
    {
      id: "err-03",
      timestamp: "2026-10-12T09:15:05Z",
      code: "DUPLICATE CONTRACT",
      severity: "Medium",
      row: "GOLDM · 25 SEP",
      reason: "Two rows with identical contract key; kept latest tick timestamp",
      action: "Deduplicated",
    },
    {
      id: "err-04",
      timestamp: "2026-10-12T09:15:10Z",
      code: "MISSING DATA",
      severity: "High",
      row: "GOLDGUINEA · 23 SEP",
      reason: "Zero volume and no official settlement price published by clearing house",
      action: "Quarantined",
    },
    {
      id: "err-05",
      timestamp: "2026-10-12T09:15:12Z",
      code: "DATE MISMATCH",
      severity: "Low",
      row: "File header",
      reason: "Filename date 29 SEP vs trade date 30 SEP in payload",
      action: "Resolved via trade date",
    },
    {
      id: "err-06",
      timestamp: "2026-10-12T09:15:15Z",
      code: "INVALID EXPIRY",
      severity: "High",
      row: "GOLDTEN · 18 SEP",
      reason: "Expiry 31 NOV 2026 not a valid calendar date",
      action: "Rejected",
    },
  ];

  public getStages(): PipelineStage[] {
    return this.stages;
  }

  public getQuarantine(): ValidationErrorItem[] {
    return this.quarantineRecords;
  }

  public validateRecord(r: RawBhavcopyRecord): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // OHLC validation
    if (r.high < r.low) errors.push("High price cannot be lower than Low price");
    if (r.high < r.open || r.high < r.close) errors.push("High must be >= Open and Close");
    if (r.low > r.open || r.low > r.close) errors.push("Low must be <= Open and Close");
    if (r.volume < 0) errors.push("Volume cannot be negative");
    if (r.openInterest < 0) errors.push("Open Interest cannot be negative");
    if (r.settlePrice <= 0) errors.push("Settlement price must be greater than zero");

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  public ingestRecord(record: RawBhavcopyRecord): {
    success: boolean;
    quarantined: boolean;
    message: string;
  } {
    const validation = this.validateRecord(record);

    if (!validation.valid) {
      const errorItem: ValidationErrorItem = {
        id: `err-${Date.now()}`,
        timestamp: new Date().toISOString(),
        code: "INVALID_OHLC_DATA",
        severity: "High",
        row: `${record.symbol} · ${record.expiry}`,
        reason: validation.errors.join("; "),
        action: "Quarantined",
      };
      this.quarantineRecords.unshift(errorItem);
      return { success: false, quarantined: true, message: validation.errors.join("; ") };
    }

    return {
      success: true,
      quarantined: false,
      message: "Record successfully ingested into pipeline",
    };
  }
}

export const pipelineManager = new MCXDataPipelineManager();
