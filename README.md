# BULLIS — Trade Beyond The Price

<div align="center">
  <img src="public/brand-logo.jpeg" alt="BULLIS Logo" width="220" />
  <p><strong>Research-Grade Commodity Derivatives Intelligence</strong></p>
</div>

---

## Overview

**BULLIS** is an institutional-grade analytics terminal designed for commodity derivatives intelligence, featuring contract-level relative-value analytics, anomaly detection, edge simulation, and multi-contract risk radar across MCX gold futures.

### Key Features

- **Overview Dashboard**: Real-time contract-level tracking (GOLD, GOLDM, GOLDGUINEA, GOLDPETAL), normalized spreads, fair-value bands, residuals, and liquidity metrics.
- **Fair Value Engine**: Term structure curves, implied carry, basis modeling, and residual dispersion analysis.
- **Edge Simulator**: Friction-adjusted quantitative backtesting, statistical arbitrage spread simulation, and execution cost analysis.
- **Anomaly DNA**: Machine-learning driven market microstructure anomaly detection, z-score clustering, and volatility regime shifts.
- **Risk Radar**: Multidimensional risk attribution, margin utilization, Greeks, and scenario stress testing.
- **Strategy Lab**: Mean-reversion and momentum strategy modeling with out-of-sample walk-forward validation.
- **Data Operations**: Feed telemetry, tick latency tracking, packet loss checks, and mark validation pipeline.

---

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) & [TanStack Router](https://tanstack.com/router)
- **Runtime & Build**: [Vite](https://vitejs.dev/) with Nitro engine
- **UI & Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & Radix UI primitives
- **Visualizations**: [Recharts](https://recharts.org/) & Framer Motion
- **Icons**: Lucide React

---

## Getting Started

### Prerequisites

- Node.js (v20+)
- npm or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/antaranadhwaryu73/BULLIS.git
cd BULLIS

# Install dependencies
npm install

# Start full-stack server (Frontend UI + Institutional Backend API)
npm run dev
```

Visit the services:

- **Frontend Terminal**: [http://localhost:8080](http://localhost:8080)
- **Backend Health & Telemetry**: [http://localhost:8080/api/v1/health](http://localhost:8080/api/v1/health)
- **Backend API Endpoints**: [http://localhost:8080/api/v1/contracts](http://localhost:8080/api/v1/contracts), `/pricing/term-structure`, `/anomalies`, `/risk/radar`, `/audit/verify`

### Testing the Backend

```bash
# Check backend health & system vitals
curl http://localhost:8080/api/v1/health

# Verify tamper-evident cryptographic audit ledger
curl http://localhost:8080/api/v1/audit/verify
```

### Production Build

```bash
# Type check and build SSR & Nitro production bundles
npm run build

# Preview production build
npm run preview

# Run unit and integration tests (Frontend + Backend)
npm run test
```

---

## License

Private & Proprietary. All rights reserved.
