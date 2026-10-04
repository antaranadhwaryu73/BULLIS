import { Calculator, Database, Dna, FlaskConical, LayoutDashboard, Network, Radar } from "lucide-react";

export const nav = [
  { to: "/", n: "01", label: "Overview", icon: LayoutDashboard },
  { to: "/fair-value", n: "02", label: "Fair Value", icon: Network },
  { to: "/edge-simulator", n: "03", label: "Edge Simulator", icon: Calculator },
  { to: "/anomaly-dna", n: "04", label: "Anomaly DNA", icon: Dna },
  { to: "/risk-radar", n: "05", label: "Risk Radar", icon: Radar },
  { to: "/strategy-lab", n: "06", label: "Strategy Lab", icon: FlaskConical },
  { to: "/data-operations", n: "07", label: "Data Operations", icon: Database },
] as const;

export type NavItem = (typeof nav)[number];
