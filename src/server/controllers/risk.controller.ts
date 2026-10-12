/**
 * Risk Radar Controller
 */

import { riskEngine } from "../domain/risk-engine";

export async function handleGetRiskRadar(url: URL): Promise<Response> {
  const notionalParam = url.searchParams.get("notional");
  const notional = notionalParam ? parseFloat(notionalParam) : 2500000;

  const state = riskEngine.computeRiskRadar(notional);
  return new Response(JSON.stringify({ data: state }, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
