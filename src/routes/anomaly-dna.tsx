import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "framer-motion";
import { pageMeta } from "@/lib/meta";
import { anomalyFactors, residualSeries } from "@/lib/mock-data";
import { PageHeader, Panel, StatusBadge, axisProps, chartTooltipStyle, EvidenceButton } from "@/components/cdi/ui";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/anomaly-dna")({
  head: () => pageMeta("Anomaly DNA", "Decompose why a residual deviation is unusual and why a signal may be suppressed."),
  component: AnomalyPage,
});

const timeline = [
  { d: "08 Sep", t: "Residual crosses +1σ", tone: "info" },
  { d: "15 Sep", t: "Peer divergence: GOLDGUINEA confirms", tone: "info" },
  { d: "22 Sep", t: "Volume spike 1.6× (roll activity)", tone: "warning" },
  { d: "29 Sep", t: "GOLDM enters tender window", tone: "danger" },
  { d: "30 Sep", t: "z = +1.84 · signal suppressed", tone: "neutral" },
] as const;

const suppressed = [
  { t: "Cost hurdle not cleared", d: "Net edge ₹34 is below the ₹91 uncertainty buffer." },
  { t: "Expiry too close", d: "GOLDM has 5 days left and is inside its tender period." },
  { t: "Confidence below threshold", d: "Model confidence is 78%; the threshold is 85%." },
];

function Gauge({ z }: { z: number }) {
  const pct = Math.min(Math.abs(z) / 3, 1);
  const r = 70, c = Math.PI * r;
  return (
    <svg viewBox="0 0 180 110" className="w-full max-w-[240px]" role="img" aria-label={`Z-score gauge at ${z}`}>
      <path d="M20 95 A70 70 0 0 1 160 95" fill="none" stroke="var(--muted)" strokeWidth="10" strokeLinecap="round" />
      <motion.path
        d="M20 95 A70 70 0 0 1 160 95" fill="none" stroke="var(--warning)" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }} transition={{ duration: 0.9, ease: "easeOut" }}
      />
      <line x1={90 + Math.cos(Math.PI * (1 - 2 / 3)) * -58} y1={95 - Math.sin(Math.PI * (2 / 3)) * 58} x2={90 + Math.cos(Math.PI * (1 - 2 / 3)) * -78} y2={95 - Math.sin(Math.PI * (2 / 3)) * 78} stroke="var(--foreground)" strokeWidth="1.5" />
      <text x="90" y="82" textAnchor="middle" className="num" fill="var(--foreground)" fontSize="26" fontWeight="600">+{z.toFixed(2)}</text>
      <text x="90" y="100" textAnchor="middle" fill="var(--muted-foreground)" fontSize="9">σ · threshold 2.0</text>
    </svg>
  );
}

function AnomalyPage() {
  return (
    <>
      <PageHeader eyebrow="04 · Anomaly DNA" title="Anomaly DNA" subtitle="Why is this deviation unusual? GOLDM OCT vs fair value." right={<EvidenceButton subject="Anomaly decomposition" />} />
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <Panel title="Current deviation">
          <div className="flex flex-col items-center">
            <Gauge z={1.84} />
            <div className="mt-2 grid w-full grid-cols-2 gap-2 text-center">
              <div className="rounded-md border bg-background/40 p-2"><div className="label-xs">Residual</div><div className="num font-semibold text-warning">+₹148</div></div>
              <div className="rounded-md border bg-background/40 p-2"><div className="label-xs">Percentile</div><div className="num font-semibold">96.7th</div></div>
            </div>
          </div>
        </Panel>
        <Panel title="Residual z-score history" subtitle="Shaded: ±2σ evidence zone" evidence="Residual history" className="min-w-0">
          <div className="h-[230px]">
            <ResponsiveContainer>
              <AreaChart data={residualSeries} margin={{ left: -20, right: 4 }}>
                <defs>
                  <linearGradient id="zfill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" {...axisProps} minTickGap={40} />
                <YAxis {...axisProps} domain={[-3, 3]} />
                <ReferenceArea y1={2} y2={3} fill="var(--warning)" fillOpacity={0.06} />
                <ReferenceArea y1={-3} y2={-2} fill="var(--warning)" fillOpacity={0.06} />
                <ReferenceLine y={0} stroke="var(--border-strong)" />
                <Tooltip {...chartTooltipStyle} />
                <Area dataKey="z" stroke="var(--primary)" strokeWidth={1.5} fill="url(#zfill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Panel title="Contribution decomposition" subtitle="Positive bars strengthen the anomaly; negative bars weaken the evidence" evidence="Factor contributions">
          <ul className="space-y-3">
            {anomalyFactors.map((f, i) => {
              const pos = f.value >= 0;
              const w = Math.abs(f.value) * 50;
              return (
                <li key={f.name} className="grid grid-cols-[150px_1fr_48px] items-center gap-3 text-xs sm:grid-cols-[170px_1fr_56px]">
                  <div>
                    <div className="font-medium">{f.name}</div>
                    <div className="truncate text-[10.5px] text-muted-foreground">{f.note}</div>
                  </div>
                  <div className="relative h-5 rounded bg-background/50">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ delay: i * 0.04, duration: 0.5 }}
                      className={cn("absolute inset-y-1 rounded-sm", pos ? "left-1/2 bg-primary/70" : "right-1/2 bg-destructive/70")}
                    />
                  </div>
                  <span className={cn("num text-right", pos ? "text-foreground" : "text-destructive")}>{pos ? "+" : "−"}{Math.abs(f.value).toFixed(2)}</span>
                </li>
              );
            })}
          </ul>
        </Panel>

        <div className="space-y-5">
          <section className="rounded-lg border border-warning/30 bg-warning/5 p-4" aria-labelledby="why-suppressed">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-warning" />
              <h2 id="why-suppressed" className="text-sm font-semibold">Why suppressed?</h2>
              <StatusBadge tone="warning" className="ml-auto">Signal suppressed</StatusBadge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">The deviation is real and unusual — but three conditions block it from becoming an actionable signal:</p>
            <ol className="mt-3 space-y-2.5">
              {suppressed.map((s, i) => (
                <li key={s.t} className="flex gap-3 rounded-md border bg-background/40 p-2.5">
                  <span className="num grid size-5 shrink-0 place-items-center rounded bg-warning/15 text-[10px] text-warning">{i + 1}</span>
                  <div>
                    <div className="text-xs font-medium">{s.t}</div>
                    <div className="text-[11px] text-muted-foreground">{s.d}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <Panel title="How the anomaly developed">
            <ol className="relative space-y-4 border-l border-border-strong pl-4">
              {timeline.map((e) => (
                <li key={e.d} className="relative">
                  <span className={cn("absolute top-1 -left-[21px] size-2.5 rounded-full border-2 border-background", e.tone === "danger" ? "bg-destructive" : e.tone === "warning" ? "bg-warning" : e.tone === "info" ? "bg-primary" : "bg-muted-foreground")} />
                  <div className="num text-[10.5px] text-muted-foreground">{e.d}</div>
                  <div className="text-xs">{e.t}</div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}
