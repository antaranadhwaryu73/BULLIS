/**
 * High-Throughput Sliding-Window Token Rate Limiter
 * Provides IP and API-Key based DoS mitigation with auto-cleanup of stale tracking records.
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  retryAfterSeconds?: number;
}

interface ClientRecord {
  count: number;
  windowStart: number;
  lastSeen: number;
}

export class SlidingWindowRateLimiter {
  private clients = new Map<string, ClientRecord>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private lastCleanup = Date.now();
  private readonly cleanupIntervalMs = 60 * 1000;

  constructor(maxRequests = 120, windowMs = 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  public check(clientId: string, customLimit?: number): RateLimitResult {
    const now = Date.now();
    this.periodicCleanup(now);

    const limit = customLimit ?? this.maxRequests;
    let record = this.clients.get(clientId);

    if (!record) {
      record = { count: 1, windowStart: now, lastSeen: now };
      this.clients.set(clientId, record);
      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        resetSeconds: Math.ceil(this.windowMs / 1000),
      };
    }

    record.lastSeen = now;

    // Reset window if elapsed
    if (now - record.windowStart >= this.windowMs) {
      record.count = 1;
      record.windowStart = now;
      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        resetSeconds: Math.ceil(this.windowMs / 1000),
      };
    }

    // Inside window
    if (record.count >= limit) {
      const resetSeconds = Math.ceil((record.windowStart + this.windowMs - now) / 1000);
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetSeconds,
        retryAfterSeconds: Math.max(1, resetSeconds),
      };
    }

    record.count += 1;
    const resetSeconds = Math.ceil((record.windowStart + this.windowMs - now) / 1000);
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - record.count),
      resetSeconds,
    };
  }

  private periodicCleanup(now: number): void {
    if (now - this.lastCleanup < this.cleanupIntervalMs) return;
    this.lastCleanup = now;

    for (const [id, rec] of this.clients.entries()) {
      if (now - rec.lastSeen > this.windowMs * 2) {
        this.clients.delete(id);
      }
    }
  }

  public reset(clientId?: string): void {
    if (clientId) {
      this.clients.delete(clientId);
    } else {
      this.clients.clear();
    }
  }
}

export const globalRateLimiter = new SlidingWindowRateLimiter(120, 60 * 1000);
export const strictRateLimiter = new SlidingWindowRateLimiter(20, 60 * 1000); // For simulation / auth endpoints
