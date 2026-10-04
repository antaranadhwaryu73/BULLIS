import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { pageMeta } from "@/lib/meta";
import { PageHeader, Panel, MetricCard, StatusBadge, statusTone, Disclaimer, EvidenceButton, chartTooltipStyle, axisProps } from "@/components/cdi/ui";

export const Route = createFileRoute("/data-operations")({
  head: () => pageMeta("Data Operations", "Ingestion pipeline status and validation errors for MCX data."),
  component: DataOps,
});

const pipeline = [
  { name: "MCX Bhavcopy ingest", status: "SAFE", last: "30 SEP 18:42", rows: "1,284", lat: "2.1s" },
  { name: "Contract spec engine", status: "SAFE", last: "30 SEP 18:43", rows: "4 specs", lat: "0.3s" },
  { name: "Price normalisation", status: "SAFE", last: "30 SEP 18:43", rows: "1,284", lat: "0.8s" },
  { name: "Expiry calendar sync", status: "WATCH", last: "29 SEP 09:00", rows: "18 events", lat: "—" },
  { name: "Fair-value model", status: "SAFE", last: "30 SEP 18:45", rows: "6 pairs", lat: "4.6s" },
  { name: "Anomaly scoring", status: "RESTRICTED", last: "30 SEP 18:45", rows: "5 / 6 pairs", lat: "1.9s" },
];

const checks = [
  { check: "Quote basis consistent with spec", scope: "All contracts", status: "SAFE", detail: "0 mismatches" },
  { check: "Purity factor applied", scope: "GOLDGUINEA", status: "SAFE", detail: "0.9167 fineness verified" },
  { check: "Tender-period flag", scope: "GOLDM", status: "WATCH", detail: "Inside tender window since 29 SEP" },
  { check: "Stale price (>1 session)", scope: "GOLDPETAL", status: "RESTRICTED", detail: "No trade on 26 SEP" },
  { check: "Volume / OI non-negative", scope: "All contracts", status: "SAFE", detail: "Passed" },
  { check: "Spec version change", scope: "GOLDM", status: "WATCH", detail: "2026.1 → 2026.2 on 06 JUN" },
];

const latency = [
  { stage: "Ingest", p50: 1.4, p95: 2.1, p99: 3.8 },
  { stage: "Normalise", p50: 0.5, p95: 0.8, p99: 1.2 },
  { stage: "Model", p50: 3.2, p95: 4.6, p99: 7.1 },
  { stage: "Score", p50: 1.1, p95: 1.9, p99: 2.6 },
];

const initialGaps = [
  { id: 1, contract: "GOLDPETAL", session: "26 SEP 2026", reason: "No trades reported", action: "pending" },
  { id: 2, contract: "GOLDGUINEA", session: "15 AUG 2026", reason: "Exchange holiday mismatch", action: "pending" },
  { id: 3, contract: "GOLDTEN", session: "02 JUL 2026", reason: "File received late", action: "repaired" },
];

const log = [
  "18:45:12 WARN anomaly: GOLDGUINEA/GOLDPETAL excluded — liquidity FAIL",
  "18:43:40 INFO normalise: 1,284 rows → ₹/10g 999 basis",
  "18:42:55 INFO ingest: bhavcopy 30SEP2026 checksum ok",
  "09:00:03 WARN calendar: tender dates for NOV series not yet published",
];

function DataOps() {
  const [gaps, setGaps] = useState(initialGaps);
  const act = (id: number, action: string) => setGaps((g) => g.map((x) => (x.id === id ? { ...x, action } : x)));
  const open = gaps.filter((g) => g.action === "pending").length;

  return (
    <>
      <PageHeader eyebrow="07 · Data Operations" title="Data Operations" subtitle="Pipeline health, validation checks and missing-session reconciliation." right={<EvidenceButton subject="Pipeline run 30 SEP 2026" />} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Data quality score" value="96.4%" tone="success" sub="Last 90 sessions" />
        <MetricCard label="Sessions ingested" value="90 / 92" sub="2 missing" tone="warning" />
        <MetricCard label="Validation checks" value="4 / 6 pass" tone="warning" sub="2 warnings, 1 block" />
        <MetricCard label="Open gaps" value={String(open)} tone={open ? "danger" : "success"} sub="Awaiting review" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Pipeline status" subtitle="Latest run per stage">
          <div className="space-y-2">
            {pipeline.map((p) => (
              <div key={p.name} className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-border py-2 text-sm">
                <div>
                  <div>{p.name}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{p.last} · {p.rows} · {p.lat}</div>
                </div>
                <StatusBadge tone={statusTone(p.status)}>{p.status === "SAFE" ? "Healthy" : p.status === "WATCH" ? "Delayed" : "Degraded"}</StatusBadge>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Validation checks" subtitle="Run after every ingest">
          <div className="space-y-2">
            {checks.map((c) => (
              <div key={c.check} className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-border py-2 text-sm">
                <div>
                  <div>{c.check}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{c.scope} · {c.detail}</div>
                </div>
                <StatusBadge tone={statusTone(c.status)}>{c.status === "SAFE" ? "Pass" : c.status === "WATCH" ? "Warn" : "Block"}</StatusBadge>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_380px]">
        <Panel title="Missing-session reconciliation" subtitle="Choose how each gap should be handled; models exclude unresolved sessions">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground">
                <tr>{["Contract", "Session", "Reason", "Status", "Action"].map((h) => <th key={h} className="px-2 py-2 font-normal">{h}</th>)}</tr>
              </thead>
              <tbody>
                {gaps.map((g) => (
                  <tr key={g.id} className="border-t border-border">
                    <td className="px-2 py-2 font-mono">{g.contract}</td>
                    <td className="px-2 font-mono">{g.session}</td>
                    <td className="px-2">{g.reason}</td>
                    <td className="px-2"><StatusBadge tone={g.action === "pending" ? "warning" : g.action === "excluded" ? "neutral" : "success"}>{g.action}</StatusBadge></td>
                    <td className="px-2">
                      {g.action === "pending" ? (
                        <div className="flex gap-1">
                          <button onClick={() => act(g.id, "repaired")} className="rounded border border-border px-2 py-1 hover:bg-accent">Interpolate</button>
                          <button onClick={() => act(g.id, "excluded")} className="rounded border border-border px-2 py-1 hover:bg-accent">Exclude</button>
                        </div>
                      ) : (
                        <button onClick={() => act(g.id, "pending")} className="text-muted-foreground underline">Undo</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Stage latency" subtitle="Seconds · p50 / p95 / p99">
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={latency}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="stage" {...axisProps} />
                <YAxis {...axisProps} width={30} />
                <Tooltip {...chartTooltipStyle} />
                <Bar dataKey="p50" fill="var(--chart-1)" />
                <Bar dataKey="p95" fill="var(--chart-2)" />
                <Bar dataKey="p99" fill="var(--chart-4)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="Event log" className="mt-4">
        <div className="space-y-1 font-mono text-[11px] text-muted-foreground">
          {log.map((l) => <div key={l}>{l}</div>)}
        </div>
      </Panel>
      <Disclaimer>Pipeline figures are sample data for demonstration; no live exchange feed is connected.</Disclaimer>
    </>
  );
}
