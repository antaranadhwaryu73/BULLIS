/**
 * Institutional Derivatives Pricing & Fair-Value Engine
 * Implements Spot-Futures Cost-of-Carry arbitrage parity, term structure curves,
 * and multi-contract cointegration residuals.
 */

import { serverConfig } from "../config";
import { contractQuoteStore } from "./contracts";
import { ContractId, PairSpreadAnalysis } from "./types";

export interface TermStructurePoint {
  contractId: ContractId;
  name: string;
  daysToExpiry: number;
  marketPrice: number;
  fairValue: number;
  impliedCarryPct: number;
  basis: number; // Market - Fair
}

export class DerivativesPricingEngine {
  private baseSpotPrice = 76200; // Benchmark pure physical gold spot ₹ / 10g

  /**
   * Calculates theoretical futures fair value under continuous/linear cost-of-carry
   * F = Spot * [ 1 + (r + storage + insurance) * (T / 365) ]
   */
  public calculateFairValue(daysToExpiry: number, spot = this.baseSpotPrice): number {
    const { riskFreeRate, goldStorageCostPct, goldInsuranceCostPct } = serverConfig.derivatives;
    const totalCostOfCarryRate = riskFreeRate + goldStorageCostPct + goldInsuranceCostPct;
    const carryFraction = totalCostOfCarryRate * (daysToExpiry / 365);
    return Math.round(spot * (1 + carryFraction));
  }

  /**
   * Computes annualized implied carry from current market price:
   * Carry = ((FuturesPrice - Spot) / Spot) * (365 / T) * 100%
   */
  public calculateImpliedCarry(
    marketPrice: number,
    daysToExpiry: number,
    spot = this.baseSpotPrice,
  ): number {
    if (daysToExpiry <= 0) return 0;
    const carry = ((marketPrice - spot) / spot) * (365 / daysToExpiry) * 100;
    return Math.round(carry * 100) / 100;
  }

  /**
   * Generates term structure curve across all active MCX Gold contracts
   */
  public getTermStructure(): TermStructurePoint[] {
    const quotes = contractQuoteStore.getAllQuotes();

    return quotes.map((q) => {
      const fair = this.calculateFairValue(q.daysToExpiry);
      const impliedCarry = this.calculateImpliedCarry(q.normalizedPrice, q.daysToExpiry);
      return {
        contractId: q.contractId,
        name: q.contractId,
        daysToExpiry: q.daysToExpiry,
        marketPrice: q.normalizedPrice,
        fairValue: fair,
        impliedCarryPct: impliedCarry,
        basis: q.normalizedPrice - fair,
      };
    });
  }

  /**
   * Evaluates pairwise relative-value spreads and z-scores
   */
  public analyzePairs(): PairSpreadAnalysis[] {
    const pairsConfig: {
      id: string;
      source: ContractId;
      target: ContractId;
      sigma: number;
      mean: number;
      halfLife: number;
      compat: "Compatible" | "Partial" | "Incompatible";
    }[] = [
      {
        id: "e1",
        source: "GOLDM",
        target: "GOLDTEN",
        sigma: 80,
        mean: -126,
        halfLife: 4.2,
        compat: "Partial",
      },
      {
        id: "e2",
        source: "GOLDTEN",
        target: "GOLDGUINEA",
        sigma: 82,
        mean: 20,
        halfLife: 5.1,
        compat: "Compatible",
      },
      {
        id: "e3",
        source: "GOLDTEN",
        target: "GOLDPETAL",
        sigma: 90,
        mean: 0,
        halfLife: 6.8,
        compat: "Compatible",
      },
      {
        id: "e4",
        source: "GOLDM",
        target: "GOLDGUINEA",
        sigma: 91,
        mean: -106,
        halfLife: 3.9,
        compat: "Partial",
      },
      {
        id: "e5",
        source: "GOLDGUINEA",
        target: "GOLDPETAL",
        sigma: 83,
        mean: -20,
        halfLife: 7.2,
        compat: "Compatible",
      },
      {
        id: "e6",
        source: "GOLDM",
        target: "GOLDPETAL",
        sigma: 81,
        mean: -126,
        halfLife: 4.5,
        compat: "Partial",
      },
    ];

    return pairsConfig.map((p) => {
      const qSource = contractQuoteStore.getQuote(p.source);
      const qTarget = contractQuoteStore.getQuote(p.target);

      const srcNorm = qSource ? qSource.normalizedPrice : 76800;
      const tgtNorm = qTarget ? qTarget.normalizedPrice : 76652;

      const spread = srcNorm - tgtNorm;
      const residual = spread - p.mean;
      const zScore = Math.round((residual / p.sigma) * 100) / 100;

      const liquidityScore: "PASS" | "WATCH" | "FAIL" =
        (qSource?.volume ?? 0) > 10000 && (qTarget?.volume ?? 0) > 5000
          ? "PASS"
          : (qSource?.volume ?? 0) > 3000
            ? "WATCH"
            : "FAIL";

      return {
        id: p.id,
        source: p.source,
        target: p.target,
        sourceNormalizedPrice: srcNorm,
        targetNormalizedPrice: tgtNorm,
        spread,
        fairSpread: p.mean,
        residual,
        zScore,
        correlation: 0.95,
        halfLifeDays: p.halfLife,
        liquidityScore,
        expiryCompatibility: p.compat,
        confidence: Math.round(Math.max(40, 95 - Math.abs(zScore) * 8)),
        uncertaintyBuffer: Math.round(p.sigma * 0.75),
      };
    });
  }
}

export const pricingEngine = new DerivativesPricingEngine();
