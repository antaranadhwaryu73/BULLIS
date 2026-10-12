/**
 * MCX Contracts & Market Data Controller
 */

import { z } from "zod";
import { contractQuoteStore, MCX_CONTRACT_SPECS } from "../domain/contracts";
import { ContractId, MarketQuote } from "../domain/types";
import { parseAndSanitizeJson } from "../security/sanitizer";
import { auditLedger } from "../security/audit-logger";
import { UserSession } from "../security/auth";

export async function handleGetContracts(): Promise<Response> {
  const quotes = contractQuoteStore.getAllQuotes();
  const result = quotes.map((q) => {
    const spec = MCX_CONTRACT_SPECS[q.contractId];
    return {
      spec,
      quote: q,
    };
  });

  return new Response(JSON.stringify({ data: result }, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function handleGetContractById(id: string): Promise<Response> {
  const quote = contractQuoteStore.getQuote(id as ContractId);
  if (!quote) {
    return new Response(
      JSON.stringify({ error: "NOT_FOUND", message: `Contract '${id}' not found` }),
      { status: 404, headers: { "Content-Type": "application/json; charset=utf-8" } },
    );
  }

  const spec = MCX_CONTRACT_SPECS[id as ContractId];
  return new Response(JSON.stringify({ spec, quote }, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

const UpdateQuoteSchema = z.object({
  lastPrice: z.number().positive(),
  volume: z.number().nonnegative().optional(),
  openInterest: z.number().nonnegative().optional(),
});

export async function handleUpdateQuote(
  request: Request,
  id: string,
  user: UserSession | null,
  clientIp: string,
): Promise<Response> {
  const payload = await parseAndSanitizeJson(request);
  const parsed = UpdateQuoteSchema.safeParse(payload);

  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "VALIDATION_FAILED", issues: parsed.error.issues }),
      { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } },
    );
  }

  const patch: Partial<MarketQuote> = { lastPrice: parsed.data.lastPrice };
  if (parsed.data.volume !== undefined) {
    patch.volume = parsed.data.volume;
  }
  if (parsed.data.openInterest !== undefined) {
    patch.openInterest = parsed.data.openInterest;
  }
  const updated = contractQuoteStore.updateQuote(id as ContractId, patch);

  await auditLedger.record({
    actorId: user?.userId ?? "anonymous",
    actorName: user?.name ?? "Anonymous",
    action: "UPDATE_CONTRACT_QUOTE",
    resource: `CONTRACT:${id}`,
    clientIp,
    status: "SUCCESS",
    details: { contractId: id, update: parsed.data },
  });

  return new Response(JSON.stringify({ success: true, quote: updated }, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
