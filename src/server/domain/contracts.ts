/**
 * MCX Contract Master & Real-time Quote Cache
 * Encapsulates conversion mathematics, tender lifecycle rules, and tick calculations.
 */

import { ContractId, ContractSpecification, MarketQuote } from "./types";

export const MCX_CONTRACT_SPECS: Record<ContractId, ContractSpecification> = {
  GOLD: {
    id: "GOLD",
    name: "Gold (1kg)",
    tradingUnit: "1 kg",
    quoteBasis: "₹ per 10 g",
    q: 10,
    purity: 0.995,
    tickSize: 1,
    lotSize: 100,
    listingDate: "2026-05-01",
    lastTradingDate: "2026-10-05",
    tenderStart: "2026-09-29",
    deliveryDate: "2026-10-05",
    specVersion: "MCX-SPEC-GOLD-2026.1",
  },
  GOLDM: {
    id: "GOLDM",
    name: "Gold Mini (100g)",
    tradingUnit: "100 g",
    quoteBasis: "₹ per 10 g",
    q: 10,
    purity: 0.995,
    tickSize: 1,
    lotSize: 10,
    listingDate: "2026-06-06",
    lastTradingDate: "2026-10-05",
    tenderStart: "2026-09-29",
    deliveryDate: "2026-10-05",
    specVersion: "MCX-SPEC-GM-2026.2",
  },
  GOLDTEN: {
    id: "GOLDTEN",
    name: "Gold Ten (10g)",
    tradingUnit: "10 g",
    quoteBasis: "₹ per 10 g",
    q: 10,
    purity: 0.995,
    tickSize: 1,
    lotSize: 1,
    listingDate: "2026-07-01",
    lastTradingDate: "2026-10-30",
    tenderStart: "2026-10-24",
    deliveryDate: "2026-10-30",
    specVersion: "MCX-SPEC-GT-2026.1",
  },
  GOLDGUINEA: {
    id: "GOLDGUINEA",
    name: "Gold Guinea (8g, 22K)",
    tradingUnit: "8 g",
    quoteBasis: "₹ per 8 g",
    q: 8,
    purity: 0.9167,
    tickSize: 1,
    lotSize: 1,
    listingDate: "2026-07-01",
    lastTradingDate: "2026-10-30",
    tenderStart: "2026-10-24",
    deliveryDate: "2026-10-30",
    specVersion: "MCX-SPEC-GG-2025.4",
  },
  GOLDPETAL: {
    id: "GOLDPETAL",
    name: "Gold Petal (1g)",
    tradingUnit: "1 g",
    quoteBasis: "₹ per 1 g",
    q: 1,
    purity: 0.995,
    tickSize: 1,
    lotSize: 1,
    listingDate: "2026-08-01",
    lastTradingDate: "2026-10-30",
    tenderStart: "2026-10-24",
    deliveryDate: "2026-10-30",
    specVersion: "MCX-SPEC-GP-2026.1",
  },
};

/**
 * Normalizes raw price to 10 grams of 100% fine (1.000) pure gold.
 * Formula: P_norm = RawPrice * (10 / Q) * (1 / Purity)
 */
export function normalizeContractPrice(
  contractId: ContractId,
  rawPrice: number,
  pure = true,
): number {
  const spec = MCX_CONTRACT_SPECS[contractId];
  if (!spec) throw new Error(`Unknown contract ID: ${contractId}`);
  const multiplier = (10 / spec.q) * (pure ? 1 / spec.purity : 1);
  return Math.round(rawPrice * multiplier * 100) / 100;
}

export function denormalizeToRawPrice(
  contractId: ContractId,
  normalizedPrice: number,
  pure = true,
): number {
  const spec = MCX_CONTRACT_SPECS[contractId];
  if (!spec) throw new Error(`Unknown contract ID: ${contractId}`);
  const divider = (10 / spec.q) * (pure ? 1 / spec.purity : 1);
  return Math.round(normalizedPrice / divider / spec.tickSize) * spec.tickSize;
}

export class ContractQuoteStore {
  private quotes = new Map<ContractId, MarketQuote>();

  constructor() {
    this.seedInitialQuotes();
  }

  private seedInitialQuotes() {
    const now = new Date("2026-10-12T15:30:00Z").toISOString();
    const seeds: Record<
      ContractId,
      {
        raw: number;
        vol: number;
        oi: number;
        dte: number;
        tender: boolean;
        status: "SAFE" | "WATCH" | "RESTRICTED";
      }
    > = {
      GOLD: { raw: 76380, vol: 24500, oi: 18400, dte: 5, tender: true, status: "WATCH" },
      GOLDM: { raw: 76412, vol: 18420, oi: 12840, dte: 5, tender: true, status: "WATCH" },
      GOLDTEN: { raw: 76538, vol: 9640, oi: 7120, dte: 30, tender: false, status: "SAFE" },
      GOLDGUINEA: { raw: 56270, vol: 3120, oi: 2480, dte: 30, tender: false, status: "SAFE" },
      GOLDPETAL: { raw: 7648, vol: 41200, oi: 15800, dte: 30, tender: false, status: "RESTRICTED" },
    };

    for (const [id, s] of Object.entries(seeds) as [ContractId, (typeof seeds)[ContractId]][]) {
      const normalizedPrice = normalizeContractPrice(id, s.raw);
      this.quotes.set(id, {
        contractId: id,
        timestamp: now,
        lastPrice: s.raw,
        open: s.raw - 45,
        high: s.raw + 110,
        low: s.raw - 80,
        close: s.raw,
        volume: s.vol,
        openInterest: s.oi,
        bid: s.raw - 1,
        ask: s.raw + 1,
        bidQty: 50,
        askQty: 45,
        normalizedPrice,
        status: s.status,
        daysToExpiry: s.dte,
        isInTenderWindow: s.tender,
      });
    }
  }

  public getQuote(id: ContractId): MarketQuote | undefined {
    return this.quotes.get(id);
  }

  public getAllQuotes(): MarketQuote[] {
    return Array.from(this.quotes.values());
  }

  public updateQuote(id: ContractId, patch: Partial<MarketQuote>): MarketQuote {
    const existing = this.quotes.get(id);
    if (!existing) throw new Error(`Contract ${id} does not exist in store`);

    const updatedPrice = patch.lastPrice ?? existing.lastPrice;
    const normalizedPrice = normalizeContractPrice(id, updatedPrice);

    const updated: MarketQuote = {
      ...existing,
      ...patch,
      lastPrice: updatedPrice,
      normalizedPrice,
      timestamp: new Date().toISOString(),
    };

    this.quotes.set(id, updated);
    return updated;
  }

  public recalibrateFromSpot(spot24k: number, spot22k: number): void {
    const goldQ = this.quotes.get("GOLD");
    if (goldQ) {
      const fairCarry = Math.round(spot24k * (1 + 0.074 * (goldQ.daysToExpiry / 365)));
      this.updateQuote("GOLD", {
        lastPrice: fairCarry - 12,
        open: fairCarry - 80,
        high: fairCarry + 150,
        low: fairCarry - 110,
        close: fairCarry - 25,
        bid: fairCarry - 13,
        ask: fairCarry - 11,
      });
    }

    const goldmQ = this.quotes.get("GOLDM");
    if (goldmQ) {
      const fairCarry = Math.round(spot24k * (1 + 0.074 * (goldmQ.daysToExpiry / 365)));
      this.updateQuote("GOLDM", {
        lastPrice: fairCarry + 20,
        open: fairCarry - 60,
        high: fairCarry + 190,
        low: fairCarry - 95,
        close: fairCarry + 10,
        bid: fairCarry + 19,
        ask: fairCarry + 21,
      });
    }

    const goldTenQ = this.quotes.get("GOLDTEN");
    if (goldTenQ) {
      const fairCarry = Math.round(spot24k * (1 + 0.074 * (goldTenQ.daysToExpiry / 365)));
      this.updateQuote("GOLDTEN", {
        lastPrice: fairCarry + 145,
        open: fairCarry + 50,
        high: fairCarry + 220,
        low: fairCarry + 30,
        close: fairCarry + 130,
        bid: fairCarry + 144,
        ask: fairCarry + 146,
      });
    }

    const guineaQ = this.quotes.get("GOLDGUINEA");
    if (guineaQ) {
      const guineaSpot8g = Math.round((spot22k / 10) * 8);
      const fairCarry = Math.round(guineaSpot8g * (1 + 0.074 * (guineaQ.daysToExpiry / 365)));
      this.updateQuote("GOLDGUINEA", {
        lastPrice: fairCarry,
        open: fairCarry - 50,
        high: fairCarry + 120,
        low: fairCarry - 70,
        close: fairCarry,
        bid: fairCarry - 1,
        ask: fairCarry + 1,
      });
    }

    const petalQ = this.quotes.get("GOLDPETAL");
    if (petalQ) {
      const petalSpot1g = Math.round(spot24k / 10);
      const fairCarry = Math.round(petalSpot1g * (1 + 0.074 * (petalQ.daysToExpiry / 365)));
      this.updateQuote("GOLDPETAL", {
        lastPrice: petalSpot1g + 5,
        open: petalSpot1g - 2,
        high: petalSpot1g + 12,
        low: petalSpot1g - 4,
        close: petalSpot1g,
        bid: petalSpot1g + 4,
        ask: petalSpot1g + 6,
      });
    }
  }
}

export const contractQuoteStore = new ContractQuoteStore();
