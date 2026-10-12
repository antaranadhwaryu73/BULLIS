/**
 * Data Pipeline & Mark Validation Controller
 */

import { z } from "zod";
import { pipelineManager } from "../domain/data-pipeline";
import { parseAndSanitizeJson } from "../security/sanitizer";
import { auditLedger } from "../security/audit-logger";
import { UserSession } from "../security/auth";

export async function handleGetPipelineStages(): Promise<Response> {
  const stages = pipelineManager.getStages();
  return new Response(JSON.stringify({ data: stages }, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function handleGetQuarantine(): Promise<Response> {
  const records = pipelineManager.getQuarantine();
  return new Response(JSON.stringify({ data: records }, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

const BhavcopyIngestSchema = z.object({
  symbol: z.string().min(1),
  expiry: z.string().min(1),
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  settlePrice: z.number().positive(),
  volume: z.number().nonnegative(),
  openInterest: z.number().nonnegative(),
  timestamp: z.string().default(() => new Date().toISOString()),
});

export async function handleIngestRecord(
  request: Request,
  user: UserSession | null,
  clientIp: string,
): Promise<Response> {
  const payload = await parseAndSanitizeJson(request);
  const parsed = BhavcopyIngestSchema.safeParse(payload);

  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "VALIDATION_FAILED", issues: parsed.error.issues }),
      { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } },
    );
  }

  const result = pipelineManager.ingestRecord(parsed.data);

  await auditLedger.record({
    actorId: user?.userId ?? "anonymous",
    actorName: user?.name ?? "Anonymous",
    action: "INGEST_BHAVCOPY_RECORD",
    resource: `BHAVCOPY:${parsed.data.symbol}`,
    clientIp,
    status: result.success ? "SUCCESS" : "FAILURE",
    details: { record: parsed.data, result },
  });

  return new Response(JSON.stringify(result, null, 2), {
    status: result.success ? 200 : 422,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
