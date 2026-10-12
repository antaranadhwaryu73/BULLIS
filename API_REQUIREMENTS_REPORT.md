# BULLIS Institutional Terminal — API Requirements & Procurement Specification

**Document Version:** 1.0.0-PROD  
**Target Audience:** API Engineering Team, Data Feed Vendors, Infrastructure Administrators  
**System:** BULLIS Commodity Derivatives Intelligence & Analytics Terminal  
**Asset Focus:** Multi Commodity Exchange of India (MCX) Gold Futures (`GOLD`, `GOLDM`, `GOLDPETAL`) & Spot Bullion

---

## 1. Executive Summary

BULLIS is an institutional-grade commodity derivatives intelligence platform designed for quantitative analysis, real-time cost-of-carry fair value estimation, calendar spread anomaly detection, and portfolio risk management on MCX gold futures contracts.

To operate in live market mode, the terminal requires specific external data feeds and database connection strings. This report specifies:
1. **Exactly which APIs and data streams are needed**
2. **Where and how to apply/procure each feed**
3. **Data payload specifications, protocols, and latency requirements**
4. **Environment variable configuration mapping**

---

## 2. API & Data Services Breakdown

```
+-----------------------------------------------------------------------------------+
|                            BULLIS CORE PLATFORM                                  |
+-----------------------------------------------------------------------------------+
        |                                 |                                 |
        v                                 v                                 v
[1. Live MCX Feed API]         [2. Spot Bullion Rate API]       [3. Cloud Database / Cache]
(Ticks, Depth, OI, Volume)     (IBJA 999 Cash Spot Price)       (PostgreSQL / Redis)
        |                                 |                                 |
        +-- TrueData                      +-- IBJA / GoldAPI.io             +-- Supabase / Neon
        +-- Zerodha Kite Connect          +-- Metals-API                    +-- MongoDB Atlas
        +-- Angel One SmartAPI            +-- Custom Broker Quote           +-- Upstash Redis
```

---

### Category A: Real-Time MCX Market Data Feed (Primary Requirement)

#### 1. Purpose in Platform
- Feeds real-time ticks into the **Fair Value Engine** to compute synthetic basis and cost-of-carry mispricings.
- Drives the **Anomaly DNA Engine** for rolling z-score calculations across near, next, and far-month contracts.
- Powers the **Risk Radar** with real-time portfolio Mark-to-Market (MTM) and Value-at-Risk (VaR).

#### 2. Instruments / Symbols Required
| Segment | Symbol | Expiry Cycle | Description |
| :--- | :--- | :--- | :--- |
| **MCX Futures** | `GOLD` | M1 (Near), M2 (Next), M3 (Far) | Standard Gold Futures (1 kg contract, quoted per 10g) |
| **MCX Futures** | `GOLDM` | M1 (Near), M2 (Next) | Gold Mini (100g contract) |
| **MCX Futures** | `GOLDPETAL` | M1 (Near) | Gold Petal (1g contract) |

#### 3. Required Data Fields per Tick
- **Instrument Identifier:** Token or Symbol (`MCX:GOLD26OCTFUT`)
- **LTP (Last Traded Price):** Decimal in INR per 10g (e.g. `75240.00`)
- **Open, High, Low, Close (OHLC):** Session prices
- **Volume:** Cumulative day volume (contracts / lots)
- **Open Interest (OI):** Total open interest contracts
- **Best 5 Bid/Ask Depth (L2 Depth):** Price and quantities for top 5 levels (used for friction & slippage modeling)
- **Timestamp:** Epoch millisecond or ISO 8601 UTC

#### 4. Supported Providers & Procurement Links

| Provider | Type | Latency | How to Apply / Procure |
| :--- | :--- | :--- | :--- |
| **[TrueData](https://www.truedata.in)** *(Recommended)* | Authorized MCX Vendor | Sub-second WebSocket | 1. Go to [truedata.in](https://www.truedata.in)<br>2. Select "MCX Real-time Data Feed (WebSocket)"<br>3. Obtain `username`, `password`, or `api_key` |
| **[Zerodha Kite Connect](https://kite.trade)** | Broker API (NSE/MCX) | ~50–100ms WebSocket | 1. Register at [kite.trade](https://kite.trade)<br>2. Create App with MCX trading privileges<br>3. Obtain `api_key` and `api_secret` (Daily request token required) |
| **[Angel One SmartAPI](https://smartapi.angelbroking.com)** | Broker API | WebSocket Streaming | 1. Sign up at [smartapi.angelbroking.com](https://smartapi.angelbroking.com)<br>2. Generate Historical & Market Feed API Key<br>3. Obtain `client_code`, `api_key`, `jwt_token` |
| **[Finvasia Shoonya](https://shoonya.com)** | Zero-brokerage API | WebSocket Feed | 1. Create developer account on Prism portal<br>2. Generate API credentials |

---

### Category B: Physical Cash Spot Gold Benchmarking API

#### 1. Purpose in Platform
The Cost-of-Carry pricing formula calculates the theoretical futures price:
$$\text{Fair Futures Price} = \text{Spot Price} \times [1 + (r + s + i) \times \frac{T}{365}]$$
Where:
- $r$ = Risk-free repo rate (RBI 6.8%)
- $s$ = Storage cost (0.5% p.a.)
- $i$ = Insurance cost (0.1% p.a.)
- $T$ = Days to maturity

The **Physical Spot Price** (ex-Ahmedabad/Mumbai IBJA 999 purity) is the anchor for this formula.

#### 2. Supported Providers & Procurement Links

| Provider | Update Frequency | How to Apply / Procure |
| :--- | :--- | :--- |
| **[GoldAPI.io](https://www.goldapi.io)** | Real-time / 1-minute | 1. Sign up at [goldapi.io](https://www.goldapi.io)<br>2. Free tier gives 100 requests/month; commercial plans give real-time INR spot rates<br>3. Key format: `goldapi-xxxxx-io` |
| **[Metals-API](https://metals-api.com)** | Real-time / Hourly | 1. Sign up at [metals-api.com](https://metals-api.com)<br>2. Generates REST endpoint for `XAU/INR` spot rate |
| **IBJA Official Scraping / Feed** | 2 updates daily (AM/PM) | Sourced directly from [ibjarates.com](https://ibjarates.com) |

---

### Category C: Production Database (TimescaleDB / PostgreSQL / MongoDB)

#### 1. Purpose in Platform
- High-frequency tick serialization and continuous time-series aggregation.
- Immutable cryptographic audit log chain verification (SHA-256 blocks).
- Order execution journal and quarantine records for invalid Bhavcopy entries.

#### 2. Procurement Options

| Service | Hosting | Recommended Plan | Connection String Format |
| :--- | :--- | :--- | :--- |
| **[Supabase](https://supabase.com)** *(Easiest)* | Cloud PostgreSQL | Free tier or Pro ($25/mo) | `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres` |
| **[Neon.tech](https://neon.tech)** | Serverless PostgreSQL | Free tier | `postgresql://[USER]:[PASSWORD]@[ENDPOINT].neon.tech/neondb?sslmode=require` |
| **[MongoDB Atlas](https://www.mongodb.com/atlas)** | Cloud NoSQL | Free M0 Sandbox | `mongodb+srv://[USER]:[PASSWORD]@cluster0.mongodb.net/bullis` |
| **Self-Hosted PostgreSQL** | On-Premise / Docker | Local/Dedicated Server | `postgresql://bullis_admin:[PASSWORD]@localhost:5432/bullis_derivatives` |

---

### Category D: In-Memory Cache (Redis)

#### 1. Purpose in Platform
- Sub-millisecond distributed caching of current order book depth and term-structure curves.
- Global sliding-window rate limiter state persistence across distributed instances.

#### 2. Procurement Options
- **[Upstash Redis](https://upstash.com)**: Serverless Redis with free tier (10,000 requests/day).
- **[Redis Cloud](https://redis.io/cloud)**: Official managed Redis cluster.
- **Connection String Format:** `redis://default:[PASSWORD]@[HOST]:[PORT]`

---

## 3. Configuration Mapping (`.env` Integration)

The API engineer should supply values for the following environment variables. These are directly read by the platform configuration engine:

```ini
# ==============================================================================
# BULLIS Institutional Terminal — External Service Credentials
# ==============================================================================

# 1. LIVE MARKET FEED INTEGRATION
# Options: TrueData token, Zerodha Kite API Key, or Angel One API Key
MCX_FEED_PROVIDER=truedata                          # truedata | zerodha | angelone | mock
MCX_FEED_API_KEY=your_feed_api_key_or_username
MCX_FEED_API_SECRET=your_feed_secret_or_password    # (if required by broker/vendor)

# 2. PHYSICAL SPOT BENCHMARK API (Optional: defaults to simulated IBJA curve)
GOLD_SPOT_API_KEY=your_goldapi_or_metalsapi_key
GOLD_SPOT_PROVIDER=goldapi                          # goldapi | metalsapi | ibja

# 3. PRODUCTION DATABASE CONNECTION
# PostgreSQL / TimescaleDB (Priority 1) or MongoDB (Priority 2)
DATABASE_URL=postgresql://bullis:secure_password@db-host.internal:5432/bullis_derivatives
# MONGODB_URI=mongodb+srv://bullis:secure_password@cluster0.mongodb.net/bullis

# 4. DISTRIBUTED CACHE LAYER (Optional)
REDIS_URL=redis://default:cache_password@redis-host.internal:6379

# 5. ENTERPRISE JWT SIGNING KEY
BULLIS_SECRET_KEY=generate_64_character_hex_secret_key_here
```

---

## 4. Summary Checklist for API Provider / Engineering Team

Please provide the items marked as **Required**:

- [ ] **[Required] Database Connection String:**
  - `DATABASE_URL` (PostgreSQL / Supabase / Neon)
- [ ] **[Required for Live Trading / Ticks] MCX Market Feed Credentials:**
  - Vendor chosen: *(TrueData / Zerodha Kite Connect / Angel One)*
  - `API Key` / `Client Code`
  - `API Secret` / `Password`
  - `WebSocket URL Endpoint`
- [ ] **[Optional] Gold Spot API Key:**
  - GoldAPI.io or Metals-API key for live physical spot reference
- [ ] **[Optional] Redis Connection String:**
  - `REDIS_URL` for distributed rate limiting & fast memory caching

---

*Report generated by BULLIS Engineering Kernel. For architecture inquiries, consult the internal server router specifications in `src/server/router.ts`.*
