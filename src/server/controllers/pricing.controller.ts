/**
 * Pricing & Fair-Value Controller
 */

import { pricingEngine } from "../domain/pricing-engine";
import { liveSpotService } from "../domain/spot-service";

export async function handleGetSpot(): Promise<Response> {
  const spot = await liveSpotService.getSpot();
  return new Response(JSON.stringify({ data: spot }, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function handleGetTermStructure(): Promise<Response> {
  await liveSpotService.getSpot();
  const curve = pricingEngine.getTermStructure();
  return new Response(JSON.stringify({ data: curve }, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function handleGetPairs(): Promise<Response> {
  await liveSpotService.getSpot();
  const pairs = pricingEngine.analyzePairs();
  return new Response(JSON.stringify({ data: pairs }, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function handleGetFairValue(url: URL): Promise<Response> {
  await liveSpotService.getSpot();
  const dteParam = url.searchParams.get("dte");
  const spotParam = url.searchParams.get("spot");

  const dte = dteParam ? parseInt(dteParam, 10) : 30;
  const spot = spotParam ? parseFloat(spotParam) : pricingEngine.getBaseSpotPrice();

  const fairValue = pricingEngine.calculateFairValue(dte, spot);
  const impliedCarry = pricingEngine.calculateImpliedCarry(fairValue, dte, spot);

  return new Response(
    JSON.stringify(
      {
        spot,
        daysToExpiry: dte,
        fairValue,
        impliedCarryPct: impliedCarry,
      },
      null,
      2,
    ),
    {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    },
  );
}
