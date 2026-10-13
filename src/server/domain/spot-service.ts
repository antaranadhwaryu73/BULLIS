/**
 * Live Spot Bullion Rate Service
 * Fetches real-time spot gold prices via GoldAPI.io, provides cached in-memory
 * access with TTL to respect rate limits, and dynamically updates the derivatives
 * pricing engine and contract quote stores in real time.
 */

import { serverConfig } from "../config";
import { contractQuoteStore } from "./contracts";
import { pricingEngine } from "./pricing-engine";

export interface LiveGoldSpotData {
  pricePerOunce: number;
  spotPrice24kPer10g: number;
  spotPrice22kPer10g: number;
  highPer10g: number;
  lowPer10g: number;
  change: number;
  changePct: number;
  timestamp: string;
  isLive: boolean;
  provider: string;
}

export class LiveSpotService {
  private cachedSpot: LiveGoldSpotData | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_TTL_MS = 60 * 1000; // 60s cache to preserve API quota
  private isFetching = false;

  public async getSpot(forceRefresh = false): Promise<LiveGoldSpotData> {
    const now = Date.now();
    if (!forceRefresh && this.cachedSpot && now - this.lastFetchTime < this.CACHE_TTL_MS) {
      return this.cachedSpot;
    }

    if (this.isFetching && this.cachedSpot) {
      return this.cachedSpot;
    }

    return this.refreshSpot();
  }

  public async refreshSpot(): Promise<LiveGoldSpotData> {
    const apiKey = serverConfig.external.goldSpotApiKey;

    if (!apiKey) {
      return this.getFallbackSpot();
    }

    this.isFetching = true;
    try {
      const response = await fetch("https://www.goldapi.io/api/XAU/INR", {
        headers: {
          "x-access-token": apiKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.warn(`[SpotService] GoldAPI error ${response.status}: ${response.statusText}`);
        return this.cachedSpot || this.getFallbackSpot();
      }

      const data = (await response.json()) as {
        price: number;
        price_gram_24k?: number;
        price_gram_22k?: number;
        high_price?: number;
        low_price?: number;
        ch?: number;
        chp?: number;
      };

      const priceGram24k =
        typeof data.price_gram_24k === "number" ? data.price_gram_24k : data.price / 31.1034768;
      const priceGram22k =
        typeof data.price_gram_22k === "number"
          ? data.price_gram_22k
          : priceGram24k * (22 / 24);

      const spotPrice24kPer10g = Math.round(priceGram24k * 10);
      const spotPrice22kPer10g = Math.round(priceGram22k * 10);
      const highPer10g = Math.round((data.high_price || data.price) / 3.11034768);
      const lowPer10g = Math.round((data.low_price || data.price) / 3.11034768);

      const spotData: LiveGoldSpotData = {
        pricePerOunce: data.price,
        spotPrice24kPer10g,
        spotPrice22kPer10g,
        highPer10g,
        lowPer10g,
        change: data.ch ?? 0,
        changePct: data.chp ?? 0,
        timestamp: new Date().toISOString(),
        isLive: true,
        provider: "GoldAPI.io (Live Market Feed)",
      };

      this.cachedSpot = spotData;
      this.lastFetchTime = Date.now();

      // Recalibrate pricing engine and contracts with live real prices
      pricingEngine.setBaseSpotPrice(spotPrice24kPer10g);
      contractQuoteStore.recalibrateFromSpot(spotPrice24kPer10g, spotPrice22kPer10g);

      return spotData;
    } catch (err) {
      console.error("[SpotService] Failed to fetch live gold spot rate:", err);
      return this.cachedSpot || this.getFallbackSpot();
    } finally {
      this.isFetching = false;
    }
  }

  public getCachedSpot(): LiveGoldSpotData {
    return this.cachedSpot || this.getFallbackSpot();
  }

  private getFallbackSpot(): LiveGoldSpotData {
    return {
      pricePerOunce: 397474,
      spotPrice24kPer10g: 127791,
      spotPrice22kPer10g: 117142,
      highPer10g: 128580,
      lowPer10g: 127560,
      change: -2107,
      changePct: -0.53,
      timestamp: new Date().toISOString(),
      isLive: false,
      provider: "Calibrated Spot",
    };
  }
}

export const liveSpotService = new LiveSpotService();
