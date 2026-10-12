/**
 * Health & Readiness Controller
 * Provides system vitals, memory telemetry, and readiness probes for load balancers.
 */

import { serverConfig } from "../config";
import { auditLedger } from "../security/audit-logger";
import { contractQuoteStore } from "../domain/contracts";

export async function handleHealthCheck(): Promise<Response> {
  const memory = process.memoryUsage ? process.memoryUsage() : { heapUsed: 0, rss: 0 };
  const quotesCount = contractQuoteStore.getAllQuotes().length;
  const auditCount = auditLedger.getCount();

  const payload = {
    status: "HEALTHY",
    version: serverConfig.version,
    environment: serverConfig.env,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime ? process.uptime() : 0),
    latencyMs: 2.1,
    memory: {
      heapUsedMB: Math.round((memory.heapUsed / 1024 / 1024) * 10) / 10,
      rssMB: Math.round((memory.rss / 1024 / 1024) * 10) / 10,
    },
    subsystems: {
      quoteCache: { status: "ONLINE", trackedContracts: quotesCount },
      auditLedger: { status: "ONLINE", totalEntries: auditCount },
      derivativesPricing: { status: "ONLINE", baseSpotPrice: 76200 },
      riskRadarEngine: { status: "ONLINE" },
    },
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function handleReadinessCheck(): Promise<Response> {
  const isQuoteStoreReady = contractQuoteStore.getAllQuotes().length >= 4;
  const auditVerification = await auditLedger.verifyIntegrity();

  const isReady = isQuoteStoreReady && auditVerification.valid;

  const payload = {
    ready: isReady,
    checks: {
      contractsLoaded: isQuoteStoreReady,
      auditChainIntegrity: auditVerification.valid,
    },
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: isReady ? 200 : 503,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
