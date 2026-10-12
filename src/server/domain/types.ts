/**
 * Domain Type Definitions for MCX Gold Derivatives Intelligence
 */

export type ContractId = "GOLD" | "GOLDM" | "GOLDTEN" | "GOLDGUINEA" | "GOLDPETAL";

export interface ContractSpecification {
  id: ContractId;
  name: string;
  tradingUnit: string;
  quoteBasis: string;
  q: number; // quote quantity in grams
  purity: number; // fineness factor (e.g. 0.995 or 0.9167)
  tickSize: number; // in rupees
  lotSize: number; // multiple of trading unit
  listingDate: string;
  lastTradingDate: string;
  tenderStart: string;
  deliveryDate: string;
  specVersion: string;
}

export interface MarketQuote {
  contractId: ContractId;
  timestamp: string;
  lastPrice: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  openInterest: number;
  bid: number;
  ask: number;
  bidQty: number;
  askQty: number;
  normalizedPrice: number; // 10g pure equivalent
  status: "SAFE" | "WATCH" | "RESTRICTED";
  daysToExpiry: number;
  isInTenderWindow: boolean;
}

export interface PairSpreadAnalysis {
  id: string;
  source: ContractId;
  target: ContractId;
  sourceNormalizedPrice: number;
  targetNormalizedPrice: number;
  spread: number;
  fairSpread: number;
  residual: number;
  zScore: number;
  correlation: number;
  halfLifeDays: number;
  liquidityScore: "PASS" | "WATCH" | "FAIL";
  expiryCompatibility: "Compatible" | "Partial" | "Incompatible";
  confidence: number;
  uncertaintyBuffer: number;
}

export interface AnomalyFactor {
  name: string;
  score: number; // -1.0 to 1.0
  direction: "up" | "down" | "neutral";
  description: string;
  weight: number;
}

export interface AnomalyReport {
  timestamp: string;
  primaryContract: ContractId;
  regime: "CALM" | "TRENDING" | "HIGH_VOLATILITY" | "DISLOCATED";
  compositeZScore: number;
  severity: "NOMINAL" | "ELEVATED" | "ANOMALOUS" | "CRITICAL";
  factors: AnomalyFactor[];
  suppressionChecklist: {
    rule: string;
    passed: boolean;
    reason: string;
  }[];
  actionRecommendation: "EXECUTE" | "SUPPRESSED" | "HOLD";
}

export interface BacktestParams {
  pairId: string;
  entryZ: number;
  exitZ: number;
  stopZ: number;
  maxHoldingDays: number;
  capitalINR: number;
  slippageTicks: number;
}

export interface TradeExecution {
  id: string;
  date: string;
  pair: string;
  side: "LONG_SPREAD" | "SHORT_SPREAD";
  entryZ: number;
  exitZ: number;
  holdingDays: number;
  grossPnL: number;
  fees: number;
  slippage: number;
  netPnL: number;
  exitReason: "MEAN_REVERSION" | "STOP_LOSS" | "TIME_STOP" | "TENDER_BUFFER";
  phase: "IN_SAMPLE" | "OUT_OF_SAMPLE" | "HOLDOUT";
}

export interface BacktestResult {
  params: BacktestParams;
  totalTrades: number;
  winRatePct: number;
  profitFactor: number;
  grossPnL: number;
  netPnL: number;
  totalFees: number;
  sharpeRatio: {
    inSample: number;
    outOfSample: number;
    holdout: number;
    decayPct: number;
  };
  maxDrawdownPct: number;
  walkForwardStability: {
    zThreshold: number;
    inSampleSharpe: number;
    outOfSampleSharpe: number;
    decayPct: number;
  }[];
  trades: TradeExecution[];
  frictionBreakdown?: {
    exchangeCharges: number;
    ctt: number;
    stampDuty: number;
    sebiCharges: number;
    gst: number;
    slippageCost: number;
    totalFriction: number;
  };
}

export interface RiskRadarState {
  portfolioMarginUtilizedPct: number;
  initialMarginINR: number;
  extremeLossMarginINR: number;
  tenderPeriodMarginINR: number;
  availableCapitalINR: number;
  greeks: {
    netDeltaINR: number;
    gamma: number;
    vegaINR: number;
    thetaINRPerDay: number;
  };
  valueAtRisk99: {
    oneDayParametricINR: number;
    fiveDayHistoricalINR: number;
  };
  stressScenarios: {
    scenario: string;
    priceShockPct: number;
    volShockPct: number;
    projectedPnLINR: number;
    marginCallProbabilityPct: number;
    status: "PASS" | "WARNING" | "CRITICAL";
  }[];
}
