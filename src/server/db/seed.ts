/**
 * Database Seeder for BULLIS Terminal
 * Pre-populates MCX contract specifications, initial quotes, and baseline records.
 */

import { DatabaseConnection } from "./connection";
import { MCX_CONTRACT_SPECS, normalizeContractPrice } from "../domain/contracts";
import { ContractId } from "../domain/types";

export async function seedDatabase(conn: DatabaseConnection): Promise<void> {
  const schema = conn.getSchema();

  // If contracts are already seeded, skip
  if (schema.tables.contracts.length > 0) return;

  await conn.transaction((tables) => {
    const now = new Date("2026-10-12T15:30:00Z").toISOString();

    // 1. Seed Contracts
    for (const spec of Object.values(MCX_CONTRACT_SPECS)) {
      tables.contracts.push({
        ...spec,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 2. Seed Initial Quotes
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
      tables.marketQuotes.push({
        id: `${id}_${now}`,
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
        createdAt: now,
      });
    }

    // 3. Seed Baseline Trades
    tables.trades.push(
      {
        id: "TRD-1000",
        date: "2026-08-12",
        pair: "GOLDM / GOLDTEN",
        side: "SHORT_SPREAD",
        entryZ: 2.1,
        exitZ: 0.3,
        holdingDays: 4,
        grossPnL: 3420,
        fees: 412,
        slippage: 380,
        netPnL: 2628,
        exitReason: "MEAN_REVERSION",
        phase: "IN_SAMPLE",
        createdAt: now,
      },
      {
        id: "TRD-1001",
        date: "2026-08-21",
        pair: "GOLDTEN / GOLDGUINEA",
        side: "LONG_SPREAD",
        entryZ: -2.0,
        exitZ: -0.6,
        holdingDays: 5,
        grossPnL: 2180,
        fees: 388,
        slippage: 512,
        netPnL: 1280,
        exitReason: "MEAN_REVERSION",
        phase: "IN_SAMPLE",
        createdAt: now,
      },
    );
  });
}
