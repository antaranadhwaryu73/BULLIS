/**
 * BULLIS Institutional Commodity Derivatives Terminal
 * Enterprise Configuration & Environment Specification
 */

export interface ServerConfig {
  env: "development" | "production" | "test";
  version: string;
  apiPrefix: string;
  security: {
    jwtSecret: string;
    apiKeyHeader: string;
    rateLimitMaxRequests: number;
    rateLimitWindowMs: number;
    maxBodySizeBytes: number;
    trustedProxies: string[];
    allowedOrigins: string[];
    corsEnabled: boolean;
  };
  derivatives: {
    riskFreeRate: number; // e.g. 0.068 (6.8% RBI repo proxy)
    goldStorageCostPct: number; // 0.005 (0.5% per annum)
    goldInsuranceCostPct: number; // 0.001 (0.1% per annum)
    mcxTransactionFeePerLakh: number; // ₹1.5
    cttRate: number; // 0.0001 (0.01% on sell side)
    stampDutyRate: number; // 0.00002 (0.002% on buy side)
    sebiTurnoverPerCrore: number; // ₹10
    gstRate: number; // 0.18 (18% GST)
  };
}

export const serverConfig: ServerConfig = {
  env: (process.env["NODE_ENV"] as "development" | "production" | "test") || "development",
  version: "1.0.0-institutional",
  apiPrefix: "/api/v1",
  security: {
    jwtSecret:
      process.env["BULLIS_SECRET_KEY"] || "bullis_institutional_sec_key_384029148092_sec_2026",
    apiKeyHeader: "x-bullis-api-key",
    rateLimitMaxRequests: 120, // 120 requests per minute per IP
    rateLimitWindowMs: 60 * 1000,
    maxBodySizeBytes: 1024 * 1024 * 2, // 2MB max JSON body
    trustedProxies: ["127.0.0.1", "::1"],
    allowedOrigins: ["http://localhost:8080", "http://127.0.0.1:8080"],
    corsEnabled: true,
  },
  derivatives: {
    riskFreeRate: 0.068,
    goldStorageCostPct: 0.005,
    goldInsuranceCostPct: 0.001,
    mcxTransactionFeePerLakh: 1.5,
    cttRate: 0.0001,
    stampDutyRate: 0.00002,
    sebiTurnoverPerCrore: 10,
    gstRate: 0.18,
  },
};
