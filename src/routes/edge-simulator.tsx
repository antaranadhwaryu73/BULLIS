import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from "recharts";
import { motion } from "framer-motion";
import { RotateCcw, ShieldCheck, ShieldX } from "lucide-react";
import { pageMeta } from "@/lib/meta";
import { fmtINR } from "@/lib/mock-data";
import { PageHeader, Panel, Disclaimer, axisProps, chartTooltipStyle } from "@/components/cdi/ui";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/edge-simulator")({
  head: () => pageMeta("Edge Survival Simulator", "Test whether an apparent relative-value edge survives fees, slippage, delays, funding and liquidity haircuts."),
  component: EdgeSim,
});

const defaults = { brokerage: 40, exchange: 26, taxes: 18, gst: 12, stamp: 6, slippage: 95, entryDelay: 1, exitDelay: 1, funding: 22, size: 1, haircut: 15 };
type Params = typeof defaults;

const controls: { key: keyof Params; label: string; min: number; max: number; step: number; unit: string; group: string }[] = [
  { key: "brokerage", label: "Brokerage", min: 0, max: 150, step: 1, unit: "₹", group: "Fees" },
  { key: "exchange", label: "Exchange fees", min: 0, max: 100, step: 1, unit: "₹", group: "Fees" },
  { key: "taxes", label: "Taxes (CTT)", min: 0, max: 80, step: 1, unit: "₹", group: "Fees" },
  { key: "gst", label: "GST", min: 0, max: 50, step: 1, unit: "₹", group: "Fees" },
  { key: "stamp", label: "Stamp duty", min: 0, max: 30, step: 1, unit: "₹", group: "Fees" },
  { key: "slippage", label: "Slippage", min: 0, max: 300, step: 5, unit: "₹", group: "Execution" },
  { key: "entryDelay", label: "Entry delay", min: 0, max: 5, step: 1, unit: "sess", group: "Execution" },
  { key: "exitDelay", label: "Exit delay", min: 0, max: 5, step: 1, unit: "sess", group: "Execution" },
  { key: "funding", label: "Funding", min: 0, max: 120, step: 1, unit: "₹", group: "Carry & size" },
  { key: "size", label: "Position size", min: 1, max: 20, step: 1, unit: "lots", group: "Carry & size" },
  { key: "haircut", label: "Liquidity haircut", min: 0, max: 60, step: 1, unit: "%", group: "Carry & size" },
];

const GROSS = 412, BUFFER = 91;

function compute(p: Params) {
  const fees = p.brokerage + p.exchange + p.taxes + p.gst + p.stamp;
  const slip = Math.round(p.slippage * (1 + (p.size - 1) * 0.06));
  const delay = Math.round((p.entryDelay + p.exitDelay) * 21);
  const funding = p.funding;
  const liq = Math.round((GROSS * p.haircut) / 100);
  const net = GROSS - fees - slip - delay - funding - liq - BUFFER;
  return { fees, slip, delay, funding, liq, net, costs: fees + slip + delay + funding + liq };
}

function EdgeSim() {
  const [p, setP] = useState<Params>(defaults);
  const r = useMemo(() => compute(p), [p]);
  const survives = r.net > 0;

  const steps = [
    { name: "Gross edge", v: GROSS, kind: "gross" },
    { name: "Fees", v: -r.fees },
    { name: "Slippage", v: -r.slip },
    { name: "Delay cost", v: -r.delay },
    { name: "Funding", v: -r.funding },
    { name: "Liq. haircut", v: -r.liq },
    { name: "Uncert. buffer", v: -BUFFER, kind: "buffer" },
    { name: "Net edge", v: r.net, kind: "net" },
  ];
  let run = 0;
  const data = steps.map((s) => {
    if (s.kind === "gross") { run = s.v; return { ...s, range: [0, s.v] }; }
    if (s.kind === "net") return { ...s, range: [0, s.v] };
    const start = run; run += s.v; return { ...s, range: [run, start] };
  });

  const breakEvenSlip = Math.max(0, p.slippage + r.net);

  return (
    <>
      <PageHeader
        eyebrow="03 · Edge Simulator"
        title="Edge Survival Simulator"
        subtitle="Does the apparent edge survive real-world friction?"
        right={<button onClick={() => setP(defaults)} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-accent"><RotateCcw className="size-3.5" /> Reset assumptions</button>}
      />
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Panel title="Friction assumptions" subtitle="Per spread round-trip, 1 lot pair basis" className="xl:sticky xl:top-20 xl:self-start">
          <div className="space-y-5">
            {["Fees", "Execution", "Carry & size"].map((g) => (
              <fieldset key={g}>
                <legend className="label-xs mb-2">{g}</legend>
                <div className="space-y-3.5">
                  {controls.filter((c) => c.group === g).map((c) => (
                    <div key={c.key}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label htmlFor={c.key} className="text-xs">{c.label}</label>
                        <div className="flex items-center gap-1">
                          <input
                            id={c.key}
                            type="number"
                            min={c.min}
                            max={c.max}
                            step={c.step}
                            value={p[c.key]}
                            onChange={(e) => setP({ ...p, [c.key]: Math.min(c.max, Math.max(c.min, Number(e.target.value) || 0)) })}
                            className="num w-16 rounded border bg-background/60 px-1.5 py-0.5 text-right text-xs focus:border-primary focus:outline-none"
                          />
                          <span className="w-7 text-[10px] text-muted-foreground">{c.unit}</span>
                        </div>
                      </div>
                      <Slider aria-label={c.label} min={c.min} max={c.max} step={c.step} value={[p[c.key]]} onValueChange={([v]) => setP({ ...p, [c.key]: v })} />
                    </div>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </Panel>

        <div className="min-w-0 space-y-5">
          <motion.div
            key={survives ? "y" : "n"}
            initial={{ opacity: 0.6, scale: 0.995 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn("flex flex-wrap items-center gap-4 rounded-lg border p-4", survives ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5")}
          >
            {survives ? <ShieldCheck className="size-8 text-success" /> : <ShieldX className="size-8 text-destructive" />}
            <div className="flex-1">
              <div className={cn("text-lg font-semibold tracking-wide", survives ? "text-success" : "text-destructive")}>{survives ? "EDGE SURVIVES" : "EDGE DOES NOT SURVIVE"}</div>
              <p className="text-xs text-muted-foreground">
                {survives ? "Under these assumptions the edge exceeds total friction plus the uncertainty buffer. This is an analytical result, not a trade recommendation." : "Total friction plus the uncertainty buffer exceeds the gross edge under these assumptions."}
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              ["Gross edge", fmtINR(GROSS), ""],
              ["Estimated costs", fmtINR(r.costs), ""],
              ["Uncertainty buffer", fmtINR(BUFFER), ""],
              ["Net edge", (r.net < 0 ? "−" : "") + fmtINR(Math.abs(r.net)), survives ? "text-success" : "text-destructive"],
              ["Break-even slippage", fmtINR(breakEvenSlip), "text-primary"],
            ].map(([k, v, t]) => (
              <div key={k} className="panel p-3.5">
                <div className="label-xs">{k}</div>
                <div className={cn("num mt-1 text-lg font-semibold", t)}>{v}</div>
              </div>
            ))}
          </div>

          <Panel title="Edge waterfall" subtitle="From gross statistical edge to net edge after friction and uncertainty" evidence="Edge waterfall">
            <div className="h-[380px]" role="img" aria-label={`Waterfall chart: gross edge ₹412, net edge ₹${r.net}`}>
              <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 24, right: 8, left: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" {...axisProps} interval={0} fontSize={10} />
                  <YAxis {...axisProps} width={48} tickFormatter={(v) => "₹" + v} />
                  <ReferenceLine y={0} stroke="var(--border-strong)" />
                  <Tooltip {...chartTooltipStyle} formatter={(_, __, item) => fmtINR((item.payload as { v: number }).v)} cursor={{ fill: "var(--accent)", opacity: 0.3 }} />
                  <Bar dataKey="range" radius={[3, 3, 3, 3]} animationDuration={400}>
                    {data.map((d) => (
                      <Cell key={d.name} fill={d.kind === "gross" ? "var(--primary)" : d.kind === "net" ? (survives ? "var(--success)" : "var(--destructive)") : d.kind === "buffer" ? "var(--warning)" : "var(--secondary)"} />
                    ))}
                    <LabelList dataKey="v" position="top" formatter={(v: number) => (v < 0 ? "−" : "") + "₹" + Math.abs(v)} style={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Disclaimer>The gross edge is derived from settlement-price residuals. Executable prices may differ; the uncertainty buffer represents 1.5× the model's residual standard error.</Disclaimer>
        </div>
      </div>
    </>
  );
}
