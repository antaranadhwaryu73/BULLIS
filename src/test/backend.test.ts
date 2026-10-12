import { describe, expect, it } from "vitest";
import {
  normalizeContractPrice,
  denormalizeToRawPrice,
  contractQuoteStore,
} from "../server/domain/contracts";
import { pricingEngine } from "../server/domain/pricing-engine";
import { backtestEngine } from "../server/domain/backtest-engine";
import { anomalyEngine } from "../server/domain/anomaly-engine";
import { riskEngine } from "../server/domain/risk-engine";
import { CryptographicAuditLedger } from "../server/security/audit-logger";
import { timingSafeEqualString, sha256Hex, verifyApiKey } from "../server/security/auth";
import { SlidingWindowRateLimiter } from "../server/security/rate-limiter";
import { dispatchApiRequest } from "../server/router";

describe("Institutional Derivatives Math & Normalization", () => {
  it("accurately normalizes MCX Gold contracts to 10g 1.000 pure equivalent", () => {
    // GOLDM: 100g contract, quote per 10g, purity 0.995, raw price ₹76,412
    const normM = normalizeContractPrice("GOLDM", 76412);
    expect(normM).toBeCloseTo(76795.98, 1);

    // GOLDGUINEA: 8g contract, quote per 8g, purity 0.9167 (22K), raw price ₹56,270
    // Multiplier = (10 / 8) * (1 / 0.9167) = 1.36358
    const normGuinea = normalizeContractPrice("GOLDGUINEA", 56270);
    expect(normGuinea).toBeGreaterThan(76000);
    expect(normGuinea).toBeLessThan(77500);

    // Round-trip invertibility check
    const rawRestored = denormalizeToRawPrice("GOLDM", normM);
    expect(rawRestored).toBe(76412);
  });

  it("calculates cost-of-carry fair values strictly positive with days to expiry", () => {
    const spot = 76200;
    const fair30 = pricingEngine.calculateFairValue(30, spot);
    const fair90 = pricingEngine.calculateFairValue(90, spot);

    expect(fair30).toBeGreaterThan(spot);
    expect(fair90).toBeGreaterThan(fair30);

    const impliedCarry = pricingEngine.calculateImpliedCarry(fair30, 30, spot);
    expect(impliedCarry).toBeGreaterThan(6.0); // Above risk free rate
  });
});

describe("Quantitative Backtest Engine & Friction Breakdown", () => {
  it("calculates exact statutory friction (MCX fee, CTT, Stamp Duty, SEBI, GST)", () => {
    const friction = backtestEngine.calculateFriction(765000, 1);
    expect(friction.exchangeCharges).toBeGreaterThan(0);
    expect(friction.ctt).toBeGreaterThan(0);
    expect(friction.stampDuty).toBeGreaterThan(0);
    expect(friction.sebiCharges).toBeGreaterThan(0);
    expect(friction.gst).toBeGreaterThan(0);
    expect(friction.totalFriction).toBeGreaterThan(100);
  });

  it("produces deterministic walk-forward stability across parameter thresholds", () => {
    const result = backtestEngine.runSimulation({
      pairId: "e1",
      entryZ: 2.1,
      exitZ: 0.3,
      stopZ: 3.0,
      maxHoldingDays: 10,
      capitalINR: 1000000,
      slippageTicks: 1,
    });

    expect(result.totalTrades).toBeGreaterThan(0);
    expect(result.winRatePct).toBeGreaterThan(50);
    expect(result.sharpeRatio.inSample).toBeGreaterThan(1.0);
    expect(result.walkForwardStability.length).toBe(5);
  });
});

describe("Risk Radar & Anomaly DNA", () => {
  it("evaluates anomaly factors and enforces tender period suppression", () => {
    const report = anomalyEngine.evaluateContractAnomaly("GOLDM");
    expect(report.primaryContract).toBe("GOLDM");
    expect(report.factors.length).toBeGreaterThanOrEqual(5);

    // GOLDM is inside tender window, so lifecycle guard must fail and trigger trade suppression
    const tenderCheck = report.suppressionChecklist.find(
      (c) => c.rule === "LIFECYCLE_TENDER_GUARD",
    );
    expect(tenderCheck?.passed).toBe(false);
    expect(report.actionRecommendation).toBe("SUPPRESSED");
  });

  it("computes margin utilization including SPAN, ELM, and tender margin", () => {
    const risk = riskEngine.computeRiskRadar(2500000);
    expect(risk.initialMarginINR).toBeGreaterThan(200000);
    expect(risk.extremeLossMarginINR).toBeGreaterThan(25000);
    expect(risk.tenderPeriodMarginINR).toBeGreaterThan(100000);
    expect(risk.stressScenarios.length).toBe(5);
  });
});

describe("Cryptographic Security & Audit Integrity", () => {
  it("provides timing-safe string comparison preventing side-channel attacks", () => {
    expect(
      timingSafeEqualString(
        "super_secret_institutional_key_123",
        "super_secret_institutional_key_123",
      ),
    ).toBe(true);
    expect(
      timingSafeEqualString(
        "super_secret_institutional_key_123",
        "super_secret_institutional_key_124",
      ),
    ).toBe(false);
    expect(timingSafeEqualString("short", "much_longer_key_here")).toBe(false);
  });

  it("verifies built-in institutional API keys", async () => {
    const verified = await verifyApiKey("bullis_quant_institutional_demo_key_2026");
    expect(verified).not.toBeNull();
    expect(verified?.role).toBe("quant");

    const invalid = await verifyApiKey("completely_fake_invalid_key_9999");
    expect(invalid).toBeNull();
  });

  it("maintains tamper-evident SHA-256 hash chaining across ledger entries", async () => {
    const ledger = new CryptographicAuditLedger();
    await ledger.record({
      actorId: "usr_quant_test",
      actorName: "Test Quant",
      action: "STRESS_TEST_RUN",
      resource: "PORTFOLIO",
      clientIp: "127.0.0.1",
      status: "SUCCESS",
      details: { notional: 2500000 },
    });

    const check = await ledger.verifyIntegrity();
    expect(check.valid).toBe(true);
  });

  it("enforces sliding-window rate limiting", () => {
    const limiter = new SlidingWindowRateLimiter(3, 1000);
    const ip = "192.168.1.100";

    expect(limiter.check(ip).allowed).toBe(true);
    expect(limiter.check(ip).allowed).toBe(true);
    expect(limiter.check(ip).allowed).toBe(true);
    const fourth = limiter.check(ip);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });
});

describe("API Dispatcher & Defense-in-Depth Endpoints", () => {
  it("responds to /api/v1/health with 200 OK and subsystem vitals", async () => {
    const req = new Request("http://localhost:8080/api/v1/health");
    const res = await dispatchApiRequest(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");

    const body = (await res.json()) as { status: string; version: string };
    expect(body.status).toBe("HEALTHY");
    expect(body.version).toBe("1.0.0-institutional");
  });

  it("rejects path traversal attempts with RFC 7807 problem details", async () => {
    const req = new Request("http://localhost:8080/api/v1/contracts?path=../../etc/passwd");
    const res = await dispatchApiRequest(req);

    expect(res.status).toBe(400);
    const problem = (await res.json()) as { type: string; title: string };
    expect(problem.title).toBe("BAD_REQUEST");
  });

  it("serves live database statistics via /api/v1/db/stats", async () => {
    const req = new Request("http://localhost:8080/api/v1/db/stats");
    const res = await dispatchApiRequest(req);

    expect(res.status).toBe(200);
    const payload = (await res.json()) as { data: { counts: { contracts: number } } };
    expect(payload.data.counts.contracts).toBeGreaterThanOrEqual(5);
  });
});

describe("Institutional Database Layer (src/server/db)", () => {
  it("initializes database with typed schema and repositories", async () => {
    const { db } = await import("../server/db");
    const contracts = db.contracts.findAll();
    expect(contracts.length).toBeGreaterThanOrEqual(5);

    const goldm = db.contracts.findById("GOLDM");
    expect(goldm?.name).toBe("Gold Mini (100g)");

    const latestQuotes = db.marketQuotes.findLatestAll();
    expect(latestQuotes.length).toBeGreaterThanOrEqual(5);

    const stats = db.getStats();
    expect(stats.version).toBe(1);
    expect(stats.counts.contracts).toBeGreaterThanOrEqual(5);
  });
});
