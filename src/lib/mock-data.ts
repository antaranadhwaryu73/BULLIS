// Deterministic mock data for the research terminal (no runtime randomness).
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export type ContractId = "GOLDM" | "GOLDTEN" | "GOLDGUINEA" | "GOLDPETAL";

export interface Contract {
  id: ContractId;
  name: string;
  expiry: string;
  tradingUnit: string;
  quoteBasis: string;
  q: number; // quote quantity in grams
  purity: number; // fineness factor
  tickSize: string;
  listingDate: string;
  lastTradingDate: string;
  tenderStart: string;
  deliveryDate: string;
  specVersion: string;
  rawPrice: number;
  volume: number;
  oi: number;
  color: string;
  status: "SAFE" | "WATCH" | "RESTRICTED";
  lastSafeExit: string;
  daysToExpiry: number;
}

export const contracts: Contract[] = [
  { id: "GOLDM", name: "Gold Mini", expiry: "05 OCT 2026", tradingUnit: "100 g", quoteBasis: "₹ per 10 g", q: 10, purity: 0.995, tickSize: "₹1", listingDate: "06 JUN 2026", lastTradingDate: "05 OCT 2026", tenderStart: "29 SEP 2026", deliveryDate: "05 OCT 2026", specVersion: "MCX-SPEC-GM-2026.2", rawPrice: 76412, volume: 18420, oi: 12840, color: "var(--chart-1)", status: "WATCH", lastSafeExit: "28 SEP 2026", daysToExpiry: 5 },
  { id: "GOLDTEN", name: "Gold Ten", expiry: "30 OCT 2026", tradingUnit: "10 g", quoteBasis: "₹ per 10 g", q: 10, purity: 0.995, tickSize: "₹1", listingDate: "01 JUL 2026", lastTradingDate: "30 OCT 2026", tenderStart: "24 OCT 2026", deliveryDate: "30 OCT 2026", specVersion: "MCX-SPEC-GT-2026.1", rawPrice: 76538, volume: 9640, oi: 7120, color: "var(--chart-2)", status: "SAFE", lastSafeExit: "23 OCT 2026", daysToExpiry: 30 },
  { id: "GOLDGUINEA", name: "Gold Guinea", expiry: "30 OCT 2026", tradingUnit: "8 g", quoteBasis: "₹ per 8 g", q: 8, purity: 0.9167, tickSize: "₹1", listingDate: "01 JUL 2026", lastTradingDate: "30 OCT 2026", tenderStart: "24 OCT 2026", deliveryDate: "30 OCT 2026", specVersion: "MCX-SPEC-GG-2025.4", rawPrice: 56270, volume: 3120, oi: 2480, color: "var(--chart-3)", status: "SAFE", lastSafeExit: "23 OCT 2026", daysToExpiry: 30 },
  { id: "GOLDPETAL", name: "Gold Petal", expiry: "30 OCT 2026", tradingUnit: "1 g", quoteBasis: "₹ per 1 g", q: 1, purity: 0.995, tickSize: "₹1", listingDate: "01 AUG 2026", lastTradingDate: "30 OCT 2026", tenderStart: "24 OCT 2026", deliveryDate: "30 OCT 2026", specVersion: "MCX-SPEC-GP-2026.1", rawPrice: 7648, volume: 41200, oi: 15800, color: "var(--chart-4)", status: "RESTRICTED", lastSafeExit: "23 OCT 2026", daysToExpiry: 30 },
];

export const normalize = (c: Contract, price = c.rawPrice, pure = true) =>
  price * (10 / c.q) * (pure ? 1 / c.purity : 1);

export const contractById = (id: string) => contracts.find((c) => c.id === id)!;

// 90 sessions of normalized prices
export const priceSeries = (() => {
  const r = rng(42);
  type Row = { label: string; date: string; fair: number; upper: number; lower: number; [k: string]: number | string };
  const out: Row[] = [];
  let base = 74200;
  const start = new Date(Date.UTC(2026, 5, 3));
  let d = 0;
  for (let i = 0; out.length < 90; i++) {
    const dt = new Date(start.getTime() + i * 86400000);
    if (dt.getUTCDay() === 0 || dt.getUTCDay() === 6) continue;
    base += (r() - 0.47) * 180;
    const row: Row = { fair: 0, upper: 0, lower: 0,
      date: dt.toISOString().slice(5, 10),
      label: dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }),
    };
    const offsets = { GOLDM: 0, GOLDTEN: 42, GOLDGUINEA: -65, GOLDPETAL: 18 };
    contracts.forEach((c) => {
      row[c.id] = Math.round(base + offsets[c.id] + (r() - 0.5) * 90 + Math.sin(d / 7) * 40);
    });
    row.fair = Math.round(base + 10);
    row.upper = Math.round(base + 10 + 160);
    row.lower = Math.round(base + 10 - 160);
    out.push(row);
    d++;
  }
  return out;
})();

export const residualSeries = (() => {
  const r = rng(7);
  return priceSeries.map((p, i) => {
    const z = Math.sin(i / 9) * 1.1 + (r() - 0.5) * 0.9 + (i > 70 ? (i - 70) * 0.04 : 0);
    return { label: p.label as string, z: +z.toFixed(2), residual: Math.round(z * 82) };
  });
})();

export const spark = (seed: number, n = 24, drift = 0) => {
  const r = rng(seed);
  let v = 50;
  return Array.from({ length: n }, (_, i) => ({ i, v: (v += (r() - 0.5 + drift) * 6) }));
};

export const kpis = {
  normalized: 76797,
  fair: 76649,
  residual: 148,
  z: 1.84,
  gross: 412,
  net: 34,
  confidence: 78,
  liquidity: "PASS",
};

export const pairs = [
  { id: "e1", source: "GOLDM", target: "GOLDTEN", residual: 148, z: 1.84, corr: 0.97, liquidity: "PASS", expiry: "Partial", window: "120 sessions", n: 118, unc: 61 },
  { id: "e2", source: "GOLDTEN", target: "GOLDGUINEA", residual: -92, z: -1.12, corr: 0.94, liquidity: "PASS", expiry: "Compatible", window: "120 sessions", n: 112, unc: 74 },
  { id: "e3", source: "GOLDTEN", target: "GOLDPETAL", residual: 37, z: 0.41, corr: 0.98, liquidity: "WATCH", expiry: "Compatible", window: "90 sessions", n: 88, unc: 48 },
  { id: "e4", source: "GOLDM", target: "GOLDGUINEA", residual: 211, z: 2.31, corr: 0.92, liquidity: "PASS", expiry: "Partial", window: "120 sessions", n: 109, unc: 88 },
  { id: "e5", source: "GOLDGUINEA", target: "GOLDPETAL", residual: 64, z: 0.77, corr: 0.91, liquidity: "FAIL", expiry: "Compatible", window: "90 sessions", n: 84, unc: 97 },
  { id: "e6", source: "GOLDM", target: "GOLDPETAL", residual: 104, z: 1.29, corr: 0.95, liquidity: "WATCH", expiry: "Partial", window: "90 sessions", n: 86, unc: 66 },
];
export type Pair = (typeof pairs)[number];

export const anomalyFactors = [
  { name: "Residual magnitude", value: 0.82, dir: "up", note: "₹148 vs 120-session σ of ₹80" },
  { name: "Peer contribution", value: 0.61, dir: "up", note: "GOLDTEN and GOLDGUINEA both diverge" },
  { name: "Volatility percentile", value: 0.34, dir: "down", note: "34th pct — calm regime" },
  { name: "Volume context", value: 0.52, dir: "up", note: "Volume 1.3× 20-day average" },
  { name: "Open interest context", value: 0.28, dir: "down", note: "OI falling into expiry" },
  { name: "Expiry distance", value: -0.71, dir: "down", note: "5 days — inside tender window" },
  { name: "Liquidity", value: 0.44, dir: "up", note: "Spread proxy within limits" },
  { name: "Data quality", value: 0.95, dir: "up", note: "All validations passed" },
  { name: "Model confidence", value: 0.58, dir: "up", note: "78% — below 85% threshold" },
];

export const suppressionReasons = [
  { ok: true, text: "Data quality passed" },
  { ok: true, text: "Contract compatibility passed" },
  { ok: false, text: "Lifecycle risk — GOLDM inside tender window" },
  { ok: true, text: "Liquidity passed" },
  { ok: false, text: "Net edge ₹34 below cost + uncertainty buffer (₹91)" },
];

export const equityCurve = (() => {
  const r = rng(11);
  let eq = 0, peak = 0;
  return Array.from({ length: 160 }, (_, i) => {
    eq += (r() - 0.44) * 2200;
    peak = Math.max(peak, eq);
    return {
      i,
      label: `F${Math.floor(i / 40) + 1}`,
      equity: Math.round(eq),
      dd: Math.round(eq - peak),
      phase: i < 100 ? "IN-SAMPLE" : i < 140 ? "OUT-OF-SAMPLE" : "HOLDOUT",
    };
  });
})();

export const residualHistogram = (() => {
  const bins = [];
  for (let x = -3; x <= 3; x += 0.25) {
    bins.push({ x: x.toFixed(2), count: Math.round(120 * Math.exp(-(x * x) / 2) + (Math.abs(x) > 2 ? 4 : 0)) });
  }
  return bins;
})();

export const trades = [
  { date: "12 Aug 2026", pair: "GOLDM / GOLDTEN", dir: "Short spread", entry: "+2.1σ", exit: "+0.3σ", gross: 3420, fees: 412, slip: 380, funding: 96, reason: "Mean reversion", phase: "IN-SAMPLE" },
  { date: "21 Aug 2026", pair: "GOLDTEN / GOLDGUINEA", dir: "Long spread", entry: "−2.0σ", exit: "−0.6σ", gross: 2180, fees: 388, slip: 512, funding: 74, reason: "Mean reversion", phase: "IN-SAMPLE" },
  { date: "02 Sep 2026", pair: "GOLDM / GOLDGUINEA", dir: "Short spread", entry: "+2.4σ", exit: "+2.9σ", gross: -1640, fees: 402, slip: 610, funding: 88, reason: "Stop: z-extension", phase: "OUT-OF-SAMPLE" },
  { date: "09 Sep 2026", pair: "GOLDTEN / GOLDPETAL", dir: "Long spread", entry: "−2.2σ", exit: "−0.1σ", gross: 2960, fees: 455, slip: 340, funding: 102, reason: "Mean reversion", phase: "OUT-OF-SAMPLE" },
  { date: "17 Sep 2026", pair: "GOLDM / GOLDTEN", dir: "Short spread", entry: "+2.0σ", exit: "+1.4σ", gross: 640, fees: 410, slip: 360, funding: 40, reason: "Time stop (5d)", phase: "HOLDOUT" },
  { date: "24 Sep 2026", pair: "GOLDM / GOLDTEN", dir: "Short spread", entry: "+2.3σ", exit: "+1.9σ", gross: 380, fees: 418, slip: 290, funding: 22, reason: "Lifecycle exit buffer", phase: "HOLDOUT" },
];

export const pipeline = [
  { stage: "MCX Bhavcopy", status: "ok", meta: "HTTP 200 · 1.2 MB" },
  { stage: "Raw Artifact", status: "ok", meta: "sha256 stored" },
  { stage: "Parser", status: "ok", meta: "v3.4.1" },
  { stage: "Schema Validation", status: "warn", meta: "2 warnings" },
  { stage: "Contract Master", status: "ok", meta: "4 matched" },
  { stage: "Normalization", status: "ok", meta: "spec 2026.2" },
  { stage: "Analytics", status: "ok", meta: "142 ms" },
  { stage: "Dashboard", status: "ok", meta: "published" },
];

export const validationErrors = [
  { code: "SUSPICIOUS OHLC", severity: "Medium", row: "GOLDPETAL · 26 SEP", reason: "High < Close by ₹2 — likely rounding in source", action: "Quarantined" },
  { code: "SCHEMA DRIFT", severity: "Low", row: "Header row", reason: "New optional column 'OPTION_TYP' appeared", action: "Ignored (mapped)" },
  { code: "DUPLICATE CONTRACT", severity: "Medium", row: "GOLDM · 25 SEP", reason: "Two rows with identical key; kept latest timestamp", action: "Deduplicated" },
  { code: "MISSING DATA", severity: "High", row: "GOLDGUINEA · 23 SEP", reason: "Zero volume and no settlement price published", action: "Quarantined" },
  { code: "DATE MISMATCH", severity: "Low", row: "File header", reason: "Filename date 29 SEP vs trade date 30 SEP", action: "Resolved via trade date" },
  { code: "INVALID EXPIRY", severity: "High", row: "GOLDTEN · 18 SEP", reason: "Expiry 31 NOV 2026 not a valid calendar date", action: "Rejected" },
];

export const fmtINR = (n: number, d = 0) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
export const signed = (n: number) => (n >= 0 ? "+" : "−") + fmtINR(Math.abs(n));
