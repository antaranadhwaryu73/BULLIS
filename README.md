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
git clone https://github.com/technovaarko11-hue/display-exact-echo.git
cd display-exact-echo

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit [http://localhost:8080](http://localhost:8080) to access the research terminal.

### Production Build

```bash
# Type check and build
npm run build

# Run unit and integration tests
npm run test
```

---

## License

Private & Proprietary. All rights reserved.
