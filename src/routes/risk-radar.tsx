import { createFileRoute } from "@tanstack/react-router";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { CalendarClock } from "lucide-react";
import { pageMeta } from "@/lib/meta";
import { contracts } from "@/lib/mock-data";
import { PageHeader, Panel, StatusBadge, statusTone, chartTooltipStyle, EvidenceButton, Disclaimer } from "@/components/cdi/ui";
import { useContractDrawer } from "@/components/cdi/drawers";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/risk-radar")({
  head: () => pageMeta("Expiry & Risk Radar", "Contract lifecycle timelines, tender periods, last safe exit dates and a multi-factor risk radar."),
  component: RiskPage,
});

// timeline from 01 JUN to 15 NOV 2026 (167 days)
const T0 = Date.UTC(2026, 5, 1), SPAN = 167 * 86400000;
const pos = (s: string) => ((Date.parse(s + " UTC") - T0) / SPAN) * 100;
const TODAY = pos("30 SEP 2026");

const radarData: Record<string, number[]> = {
  GOLDM: [92, 30, 10, 85, 70, 5],
  GOLDTEN: [35, 40, 10, 25, 30, 5],
  GOLDGUINEA: [35, 62, 22, 25, 35, 30],
  GOLDPETAL: [35, 78, 15, 25, 30, 10],
};
const axes = ["Expiry proximity", "Liquidity", "Data quality", "Tender risk", "Roll risk", "Missing sessions"];

function RiskPage() {
  const [sel, setSel] = useState("GOLDM");
  const openContract = useContractDrawer();
  const c = contracts.find((x) => x.id === sel)!;
  const rd = axes.map((a, i) => ({ axis: a, v: radarData[sel]![i]! }));
  const months = ["JUN", "JUL", "AUG", "SEP", "OCT", "NOV"];
  return (
    <>
      <PageHeader eyebrow="05 · Risk Radar" title="Expiry & Risk Radar" subtitle="Lifecycle constraints that determine whether a relationship can be used safely." right={<EvidenceButton subject="Lifecycle calendar" />} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {contracts.map((x) => (
          <button key={x.id} onClick={() => setSel(x.id)} aria-pressed={sel === x.id} className={cn("panel p-4 text-left transition-colors", sel === x.id ? "border-primary/50" : "hover:border-border-strong")}>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold"><span className="size-2 rounded-full" style={{ background: x.color }} />{x.id}</span>
              <StatusBadge tone={statusTone(x.status)}>{x.status}</StatusBadge>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" />
              <div>
                <div className="label-xs text-[9.5px]">Last safe exit date</div>
                <div className="num text-base font-semibold">{x.lastSafeExit}</div>
              </div>
              <div className="num ml-auto text-right text-xs text-muted-foreground">{x.daysToExpiry}d<br />to expiry</div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Panel title="Contract lifecycle" subtitle="Listing → active trading → exit buffer → tender → delivery" className="min-w-0">
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="relative ml-28 h-5 text-[10px] text-muted-foreground">
                {months.map((m, i) => <span key={m} className="num absolute" style={{ left: `${pos(`01 ${m} 2026`)}%` }}>{m}</span>)}
                {i0}
              </div>
              <div className="relative space-y-3">
                <div className="pointer-events-none absolute top-0 bottom-0 z-10 ml-28 w-[calc(100%-7rem)]">
                  <div className="absolute inset-y-0 w-px bg-primary" style={{ left: `${TODAY}%` }}>
                    <span className="num absolute -top-1 left-1 rounded bg-primary px-1 text-[9px] text-primary-foreground">TODAY</span>
                  </div>
                </div>
                {contracts.map((x) => {
                  const L = pos(x.listingDate), S = pos(x.lastSafeExit), Tn = pos(x.tenderStart), E = pos(x.lastTradingDate);
                  return (
                    <button key={x.id} onClick={() => openContract(x.id)} className="flex w-full items-center text-left">
                      <span className="w-28 shrink-0 text-xs font-medium">{x.id}<span className="num block text-[10px] text-muted-foreground">{x.expiry.slice(3)}</span></span>
                      <div className="relative h-7 flex-1 rounded bg-background/40">
                        <div className="absolute inset-y-1 rounded-l bg-primary/35" style={{ left: `${L}%`, width: `${S - L}%` }} title="Active trading" />
                        <div className="absolute inset-y-1 bg-warning/40" style={{ left: `${S}%`, width: `${Math.max(Tn - S, 0.6)}%` }} title="Minimum exit buffer" />
                        <div className="absolute inset-y-1 bg-destructive/45 [background-image:repeating-linear-gradient(45deg,transparent_0_4px,var(--background)_4px_5px)]" style={{ left: `${Tn}%`, width: `${E - Tn}%` }} title="Tender period" />
                        <div className="absolute inset-y-0 w-0.5 bg-foreground" style={{ left: `${E}%` }} title="Last trading date" />
                        <div className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-muted-foreground" style={{ left: `${L}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 ml-28 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm bg-primary/35" />Active trading</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm bg-warning/40" />Minimum exit buffer</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm bg-destructive/45" />Tender / delivery risk</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-foreground" />Last trading date</span>
              </div>
            </div>
          </div>
        </Panel>
        <Panel title={`Risk radar · ${c.id}`} subtitle="0 = low risk, 100 = high risk" evidence={`Risk radar ${c.id}`}>
          <div className="h-[290px]" role="img" aria-label={`Risk radar for ${c.id}: ${rd.map((r) => `${r.axis} ${r.v}`).join(", ")}`}>
            <ResponsiveContainer>
              <RadarChart data={rd} outerRadius="72%">
                <PolarGrid stroke="var(--border-strong)" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip {...chartTooltipStyle} />
                <Radar dataKey="v" stroke={c.color} fill={c.color} fillOpacity={0.22} strokeWidth={1.5} animationDuration={400} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
            {rd.map((r) => (
              <li key={r.axis} className="flex justify-between rounded bg-background/40 px-2 py-1">
                <span className="text-muted-foreground">{r.axis}</span>
                <span className={cn("num", r.v >= 70 ? "text-destructive" : r.v >= 50 ? "text-warning" : "text-foreground")}>{r.v}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Disclaimer>SAFE: outside all lifecycle buffers. WATCH: approaching the minimum exit buffer. RESTRICTED: a lifecycle or liquidity rule excludes the contract from signal generation.</Disclaimer>
    </>
  );
}

const i0 = null;
