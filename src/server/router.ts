/**
 * Master REST API Router & Request Dispatcher
 * Dispatches versioned API endpoints, enforces authentication, RBAC,
 * rate limiting, and RFC 7807 problem details error envelopes.
 */

import { serverConfig } from "./config";
import { applySecurityHeaders } from "./security/headers";
import { globalRateLimiter, strictRateLimiter } from "./security/rate-limiter";
import { authenticateRequest, authorizePermission, authorizeRole } from "./security/auth";
import {
  ApiSecurityError,
  createProblemDetailsResponse,
  detectSuspiciousPatterns,
} from "./security/sanitizer";

// Controllers
import { handleHealthCheck, handleReadinessCheck } from "./controllers/health.controller";
import {
  handleGetContracts,
  handleGetContractById,
  handleUpdateQuote,
} from "./controllers/contracts.controller";
import {
  handleGetFairValue,
  handleGetPairs,
  handleGetTermStructure,
} from "./controllers/pricing.controller";
import { handleGetAnomalies } from "./controllers/anomaly.controller";
import { handleGetFriction, handleRunBacktest } from "./controllers/simulator.controller";
import { handleGetRiskRadar } from "./controllers/risk.controller";
import {
  handleGetPipelineStages,
  handleGetQuarantine,
  handleIngestRecord,
} from "./controllers/pipeline.controller";
import { handleGetAuditLogs, handleVerifyAuditChain } from "./controllers/audit.controller";
import { handleGetDbStats } from "./controllers/db.controller";

export async function dispatchApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();
  const origin = request.headers.get("origin");

  // Handle CORS pre-flight OPTIONS
  if (method === "OPTIONS") {
    const preflight = new Response(null, { status: 204 });
    applySecurityHeaders(preflight.headers, origin);
    return preflight;
  }

  // Generate or forward request correlation ID
  const correlationId =
    request.headers.get("x-request-id") ||
    `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  // Extract client IP
  const clientIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1";

  // Prevent path traversal in URI
  if (
    detectSuspiciousPatterns(request.url) ||
    detectSuspiciousPatterns(path) ||
    detectSuspiciousPatterns(url.search)
  ) {
    const response = createProblemDetailsResponse(
      400,
      "BAD_REQUEST",
      "Suspicious character sequences detected in URI",
      path,
    );
    applySecurityHeaders(response.headers, origin);
    response.headers.set("x-request-id", correlationId);
    return response;
  }

  // Rate Limiting
  const isSimulationOrAuth = path.includes("/simulator/backtest") || path.includes("/auth");
  const rateLimiter = isSimulationOrAuth ? strictRateLimiter : globalRateLimiter;
  const rateLimitResult = rateLimiter.check(clientIp);

  if (!rateLimitResult.allowed) {
    const response = createProblemDetailsResponse(
      429,
      "TOO_MANY_REQUESTS",
      `Rate limit exceeded. Try again in ${rateLimitResult.retryAfterSeconds} seconds.`,
      path,
    );
    applySecurityHeaders(response.headers, origin);
    response.headers.set("Retry-After", String(rateLimitResult.retryAfterSeconds));
    response.headers.set("X-RateLimit-Limit", String(rateLimitResult.limit));
    response.headers.set("X-RateLimit-Remaining", "0");
    response.headers.set("x-request-id", correlationId);
    return response;
  }

  try {
    // Authenticate caller
    const user = await authenticateRequest(request);

    let response: Response;

    // --- HEALTH & READINESS ---
    if (path === "/api/v1/health" && method === "GET") {
      response = await handleHealthCheck();
    } else if (path === "/api/v1/ready" && method === "GET") {
      response = await handleReadinessCheck();
    }
    // --- AUTHENTICATION & SESSION ---
    else if (path === "/api/v1/auth/session" && method === "GET") {
      response = new Response(JSON.stringify({ user }, null, 2), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
    // --- CONTRACTS ---
    else if (path === "/api/v1/contracts" && method === "GET") {
      response = await handleGetContracts();
    } else if (path.startsWith("/api/v1/contracts/") && method === "GET") {
      const id = path.replace("/api/v1/contracts/", "");
      response = await handleGetContractById(id);
    } else if (
      path.startsWith("/api/v1/contracts/") &&
      path.endsWith("/quote") &&
      method === "PATCH"
    ) {
      if (!authorizeRole(user, "quant")) {
        throw new ApiSecurityError(403, "FORBIDDEN", "Quant role required to update quotes");
      }
      const id = path.replace("/api/v1/contracts/", "").replace("/quote", "");
      response = await handleUpdateQuote(request, id, user, clientIp);
    }
    // --- PRICING & FAIR VALUE ---
    else if (path === "/api/v1/pricing/term-structure" && method === "GET") {
      response = await handleGetTermStructure();
    } else if (path === "/api/v1/pricing/pairs" && method === "GET") {
      response = await handleGetPairs();
    } else if (path === "/api/v1/pricing/fair-value" && method === "GET") {
      response = await handleGetFairValue(url);
    }
    // --- ANOMALY DNA ---
    else if (path === "/api/v1/anomalies" && method === "GET") {
      response = await handleGetAnomalies(url);
    }
    // --- EDGE SIMULATOR ---
    else if (path === "/api/v1/simulator/backtest" && method === "POST") {
      if (!authorizePermission(user, "backtest_run")) {
        throw new ApiSecurityError(403, "FORBIDDEN", "Missing 'backtest_run' permission");
      }
      response = await handleRunBacktest(request, user, clientIp);
    } else if (path === "/api/v1/simulator/friction" && method === "GET") {
      response = await handleGetFriction(url);
    }
    // --- RISK RADAR ---
    else if (path === "/api/v1/risk/radar" && method === "GET") {
      response = await handleGetRiskRadar(url);
    }
    // --- PIPELINE & DATA OPERATIONS ---
    else if (path === "/api/v1/pipeline/stages" && method === "GET") {
      response = await handleGetPipelineStages();
    } else if (path === "/api/v1/pipeline/quarantine" && method === "GET") {
      response = await handleGetQuarantine();
    } else if (path === "/api/v1/pipeline/ingest" && method === "POST") {
      if (!authorizeRole(user, "admin")) {
        throw new ApiSecurityError(403, "FORBIDDEN", "Admin role required to ingest Bhavcopy data");
      }
      response = await handleIngestRecord(request, user, clientIp);
    }
    // --- AUDIT LEDGER ---
    else if (path === "/api/v1/audit/logs" && method === "GET") {
      if (!authorizePermission(user, "audit_read")) {
        throw new ApiSecurityError(403, "FORBIDDEN", "Audit read permission required");
      }
      response = await handleGetAuditLogs(url);
    } else if (path === "/api/v1/audit/verify" && method === "GET") {
      response = await handleVerifyAuditChain();
    }
    // --- DATABASE TELEMETRY ---
    else if (path === "/api/v1/db/stats" && method === "GET") {
      response = await handleGetDbStats();
    }
    // --- NOT FOUND ---
    else {
      response = createProblemDetailsResponse(
        404,
        "ENDPOINT_NOT_FOUND",
        `API route '${method} ${path}' does not exist on BULLIS v1`,
        path,
      );
    }

    // Attach security & rate limit headers
    applySecurityHeaders(response.headers, origin);
    response.headers.set("X-RateLimit-Limit", String(rateLimitResult.limit));
    response.headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining));
    response.headers.set("x-request-id", correlationId);
    return response;
  } catch (err) {
    if (err instanceof ApiSecurityError) {
      const response = createProblemDetailsResponse(
        err.status,
        err.code,
        err.message,
        path,
        err.details,
      );
      applySecurityHeaders(response.headers, origin);
      response.headers.set("x-request-id", correlationId);
      return response;
    }

    console.error(`[API UNHANDLED ERROR] [${correlationId}]`, err);
    const response = createProblemDetailsResponse(
      500,
      "INTERNAL_SERVER_ERROR",
      "An unexpected institutional processing error occurred. Incident logged.",
      path,
    );
    applySecurityHeaders(response.headers, origin);
    response.headers.set("x-request-id", correlationId);
    return response;
  }
}
