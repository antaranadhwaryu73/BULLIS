/**
 * Edge Simulator & Friction Backtest Controller
 */

import { z } from "zod";
import { backtestEngine } from "../domain/backtest-engine";
import { parseAndSanitizeJson } from "../security/sanitizer";
import { auditLedger } from "../security/audit-logger";
import { UserSession } from "../security/auth";

const BacktestRequestSchema = z.object({
  pairId: z.string().default("e1"),
  entryZ: z.number().min(0.5).max(5.0).default(2.0),
  exitZ: z.number().min(-2.0).max(2.0).default(0.2),
  stopZ: z.number().min(1.0).max(6.0).default(3.0),
  maxHoldingDays: z.number().int().min(1).max(60).default(10),
  capitalINR: z.number().positive().default(1000000),
  slippageTicks: z.number().int().min(0).max(20).default(1),
});

export async function handleRunBacktest(
  request: Request,
  user: UserSession | null,
  clientIp: string,
): Promise<Response> {
  const payload = await parseAndSanitizeJson(request);
  const parsed = BacktestRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "VALIDATION_FAILED", issues: parsed.error.issues }),
      { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } },
    );
  }

  const result = backtestEngine.runSimulation(parsed.data);

  await auditLedger.record({
    actorId: user?.userId ?? "anonymous",
    actorName: user?.name ?? "Anonymous",
    action: "RUN_QUANT_BACKTEST",
    resource: `PAIR:${parsed.data.pairId}`,
    clientIp,
    status: "SUCCESS",
    details: {
      params: parsed.data,
      winRate: result.winRatePct,
      netPnL: result.netPnL,
    },
  });

  return new Response(JSON.stringify({ data: result }, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function handleGetFriction(url: URL): Promise<Response> {
  const notional = parseFloat(url.searchParams.get("notional") || "765000");
  const slippageTicks = parseInt(url.searchParams.get("slippage") || "1", 10);

  const friction = backtestEngine.calculateFriction(notional, slippageTicks);
  return new Response(JSON.stringify({ data: friction }, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
