/**
 * Audit Ledger & Regulatory Compliance Controller
 */

import { auditLedger } from "../security/audit-logger";

export async function handleGetAuditLogs(url: URL): Promise<Response> {
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 50;

  const logs = auditLedger.getRecent(Math.min(200, Math.max(1, limit)));
  return new Response(JSON.stringify({ count: logs.length, data: logs }, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function handleVerifyAuditChain(): Promise<Response> {
  const verification = await auditLedger.verifyIntegrity();
  return new Response(
    JSON.stringify(
      {
        valid: verification.valid,
        brokenAtIndex: verification.brokenAtIndex,
        totalVerified: auditLedger.getCount(),
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
    {
      status: verification.valid ? 200 : 409,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    },
  );
}
