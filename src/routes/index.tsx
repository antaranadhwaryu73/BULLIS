import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, Brush, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, Cell } from "recharts";
import { Download, ChevronRight } from "lucide-react";
import { pageMeta } from "@/lib/meta";
import { contracts, fmtINR, kpis, priceSeries, residualSeries, signed, spark, suppressionReasons, type ContractId } from "@/lib/mock-data";
import { MetricCard, NoSignalPanel, Panel, Seg, StatusBadge, statusTone, axisProps, Disclaimer } from "@/components/cdi/ui";
import { useContractDrawer } from "@/components/cdi/drawers";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => pageMeta("Overview", "Contract-level relative-value analytics for MCX gold futures: data validity, normalized prices, residuals and signal state."),
  component: Overview,
});

function HealthStrip() {
  const items = [
    { l: "Data quality", v: <StatusBadge tone="success">Valid</StatusBadge> },
    { l: "Data freshness", v: <span className="num text-sm">30 SEP 2026</span> },
    { l: "Contract coverage", v: <span className="num text-sm">100%</span> },
    { l: "Model", v: <span className="text-sm">Rolling Robust Regression</span> },
    { l: "Signal state", v: <StatusBadge tone="neutral">No actionable signal</StatusBadge> },
  ];
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3 lg:grid-cols-5">
      {items.map((i) => (
        <div key={i.l} className="flex flex-col gap-1.5 bg-panel/80 px-4 py-3">
          <span className="label-xs">{i.l}</span>
          {i.v}
        </div>
      ))}
    </div>
  );
}

const ranges = { "1M": 22, "3M": 90, "6W": 30 } as const;

function MarketChart() {
  const openContract = useContractDrawer();
  const [active, setActive] = useState<ContractId[]>(["GOLDM", "GOLDTEN", "GOLDGUINEA", "GOLDPETAL"]);
  const [mode, setMode] = useState<"norm" | "raw">("norm");
  const [basis, setBasis] = useState<"pure" | "gross">("pure");
  const [range, setRange] = useState<keyof typeof ranges>("3M");
  const [band, setBand] = useState(true);

  const data = useMemo(() => {
    return priceSeries.slice(-ranges[range]).map((row) => {
      const out: Record<string, string | number | [number, number]> = { label: row.label };
      contracts.forEach((c) => {
        const n = row[c.id] as number;
        let v = basis === "gross" ? n * c.purity : n;
        if (mode === "raw") v = n * (c.q / 10) * c.purity;
        out[c.id] = Math.round(v);
      });
      out["fair"] = basis === "gross" ? Math.round((row.fair as number) * 0.995) : (row.fair as number);
      out["band"] = [row.lower as number, row.upper as number];
      return out;
    });
  }, [range, basis, mode]);

  const exportCsv = () => {
    const keys = ["label", ...active];
    const csv = [keys.join(","), ...data.map((r) => keys.map((k) => r[k]).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "cdi-normalized-prices.csv"; a.click();
    toast("Exported CSV", { description: `${data.length} sessions · ${active.length} contracts` });
  };

  const CustomTooltip = ({ active: on, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number; color: string }[]; label?: string }) => {
    if (!on || !payload?.length) return null;
    return (
      <div className="min-w-[260px] rounded-md border border-border-strong bg-popover p-3 text-[11px] shadow-xl">
        <div className="mb-2 flex justify-between"><span className="font-semibold">{label} 2026</span><span className="text-muted-foreground">src 18:42 IST</span></div>
        {payload.filter((p) => contracts.some((c) => c.id === p.dataKey)).map((p) => {
          const c = contracts.find((x) => x.id === p.dataKey)!;
          return (
            <div key={p.dataKey} className="border-t border-border py-1.5 first:border-0">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium"><span className="size-1.5 rounded-full" style={{ background: c.color }} />{c.id} · {c.expiry.slice(3)}</span>
                <span className="num">{fmtINR(p.value)}</span>
              </div>
              <div className="num mt-0.5 grid grid-cols-3 gap-1 text-[10px] text-muted-foreground">
                <span>Raw {fmtINR(Math.round(p.value * (mode === "raw" ? 1 : (c.q / 10) * c.purity)))}</span>
                <span>Pur {c.purity}</span>
                <span>Vol {c.volume.toLocaleString()}</span>
                <span>OI {c.oi.toLocaleString()}</span>
                <span className="col-span-2">{c.specVersion}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Panel
      title="Normalized price comparison"
      subtitle={`${mode === "norm" ? "₹ per 10 g" : "Raw exchange quote"} · ${basis === "pure" ? "pure-gold basis" : "gross-metal basis"} · settlement marks`}
      evidence="Normalized price series"
      actions={<button onClick={exportCsv} className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"><Download className="size-3.5" /> Export</button>}
      className="min-w-0"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Contracts">
          {contracts.map((c) => {
            const on = active.includes(c.id);
            return (
              <button
                key={c.id}
                aria-pressed={on}
                onClick={() => setActive((a) => (on ? a.filter((x) => x !== c.id) : [...a, c.id]))}
                className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors", on ? "border-border-strong bg-accent" : "text-muted-foreground opacity-60 hover:opacity-100")}
              >
                <span className="size-2 rounded-full" style={{ background: c.color }} /> {c.id}
                <span className="num text-[10px] text-muted-foreground">{c.expiry.slice(3, 6)}</span>
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Seg label="Price mode" value={mode} onChange={setMode} options={[{ value: "norm", label: "Normalized" }, { value: "raw", label: "Raw" }]} />
          <Seg label="Basis" value={basis} onChange={setBasis} options={[{ value: "pure", label: "Pure gold" }, { value: "gross", label: "Gross metal" }]} />
          <Seg label="Range" value={range} onChange={setRange} options={[{ value: "6W", label: "6W" }, { value: "1M", label: "1M" }, { value: "3M", label: "3M" }]} />
          {mode === "norm" && <Seg label="Fair-value band" value={band ? "on" : "off"} onChange={(v) => setBand(v === "on")} options={[{ value: "on", label: "FV band" }, { value: "off", label: "Off" }]} />}
        </div>
      </div>
      <div className="h-[360px]" role="img" aria-label="Line chart of normalized gold futures prices for four MCX contracts over time with fair-value band">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" {...axisProps} minTickGap={32} />
            <YAxis {...axisProps} domain={["auto", "auto"]} width={60} tickFormatter={(v) => (v / 1000).toFixed(1) + "k"} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
            {mode === "norm" && band && <Area dataKey="band" stroke="none" fill="var(--primary)" fillOpacity={0.07} isAnimationActive={false} />}
            {mode === "norm" && band && <Line dataKey="fair" stroke="var(--muted-foreground)" strokeDasharray="4 4" dot={false} strokeWidth={1} />}
            {contracts.filter((c) => active.includes(c.id)).map((c) => (
              <Line key={c.id} dataKey={c.id} stroke={c.color} strokeWidth={1.6} dot={false} activeDot={{ r: 3 }} animationDuration={500} />
            ))}
            <Brush dataKey="label" height={22} stroke="var(--border-strong)" fill="var(--background)" travellerWidth={8} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <Disclaimer>Drag the handles below the chart to zoom and pan. Values are end-of-day settlement marks, not executable prices.</Disclaimer>
    </Panel>
  );
}

function ResidualChart() {
  const data = residualSeries.slice(-60);
  return (
    <Panel title="Residual z-score · GOLDM vs fair value" subtitle="±2σ evidence threshold" evidence="Residual z-score">
      <div className="h-[180px]" role="img" aria-label="Bar chart of residual z-scores, latest +1.84">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ left: -20, right: 4 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" {...axisProps} minTickGap={40} />
            <YAxis {...axisProps} domain={[-3, 3]} />
            <ReferenceLine y={2} stroke="var(--warning)" strokeDasharray="3 3" />
            <ReferenceLine y={-2} stroke="var(--warning)" strokeDasharray="3 3" />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border-strong)", fontSize: 11 }} />
            <Bar dataKey="z" radius={[2, 2, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={Math.abs(d.z) >= 2 ? "var(--warning)" : i === data.length - 1 ? "var(--primary)" : "var(--secondary)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function Overview() {
  const openContract = useContractDrawer();
  return (
    <>
      <section className="hero-glow relative overflow-hidden rounded-xl border p-5 lg:p-6">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-[0.25] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="relative">
          <div className="label-xs text-primary">BULLIS · MCX Gold Futures Complex</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight lg:text-[28px]">Commodity Derivatives Intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground">Trade beyond the price with contract-level relative-value analytics for MCX gold futures</p>
          <div className="mt-5"><HealthStrip /></div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <MetricCard label="Normalized price" value={fmtINR(kpis.normalized)} sub="per 10 g · GOLDM" sparkData={spark(3, 24, 0.05)} />
        <MetricCard label="Fair value" value={fmtINR(kpis.fair)} sub="RRR · 120 sessions" sparkData={spark(5, 24, 0.04)} />
        <MetricCard label="Residual" value={signed(kpis.residual)} sub="actual − fair" tone="warning" sparkData={spark(9, 24, 0.08)} />
        <MetricCard label="Z-score" value="+1.84" sub="threshold ±2.00" tone="warning" />
        <MetricCard label="Gross edge" value={fmtINR(kpis.gross)} sub="before friction" />
        <MetricCard label="Net edge" value={fmtINR(kpis.net)} sub="< ₹91 buffer" tone="danger" />
        <MetricCard label="Confidence" value={`${kpis.confidence}%`} sub="threshold 85%" tone="warning" />
        <MetricCard label="Liquidity" value="PASS" sub="spread proxy 0.8 bp" tone="success" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          <MarketChart />
          <ResidualChart />
        </div>
        <div className="space-y-5">
          <NoSignalPanel reasons={suppressionReasons} />
          <Panel title="Active contracts" subtitle="Click to inspect specification" bodyClassName="p-2">
            <ul className="space-y-1">
              {contracts.map((c) => (
                <li key={c.id}>
                  <button onClick={() => openContract(c.id)} className="group flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left transition-colors hover:bg-accent">
                    <span className="h-8 w-0.5 rounded-full" style={{ background: c.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[13px] font-medium">{c.id} <span className="num text-[10px] text-muted-foreground">{c.expiry}</span></div>
                      <div className="num text-[11px] text-muted-foreground">{fmtINR(c.rawPrice)} raw · {c.quoteBasis}</div>
                    </div>
                    <StatusBadge tone={statusTone(c.status)}>{c.status}</StatusBadge>
                    <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Five-second read">
            <ol className="space-y-2.5 text-xs">
              {[
                ["Is the data valid?", "Yes — all 4 contracts validated", "success"],
                ["Unusual deviation?", "Moderate: +1.84σ, below 2σ", "warning"],
                ["Survives costs?", "No — net ₹34 < ₹91 buffer", "danger"],
                ["Actionable signal?", "No — see reasons above", "neutral"],
              ].map(([q, a, t]) => (
                <li key={q} className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">{q}</span>
                  <span className={cn("text-right font-medium", t === "success" && "text-success", t === "warning" && "text-warning", t === "danger" && "text-destructive")}>{a}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}
