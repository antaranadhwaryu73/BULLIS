/**
 * Anomaly DNA & Signal Suppression Controller
 */

import { anomalyEngine } from "../domain/anomaly-engine";
import { ContractId } from "../domain/types";

export async function handleGetAnomalies(url: URL): Promise<Response> {
  const contract = (url.searchParams.get("contract") as ContractId) || "GOLDM";
  const report = anomalyEngine.evaluateContractAnomaly(contract);

  return new Response(JSON.stringify({ data: report }, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
