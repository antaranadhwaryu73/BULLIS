import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { pageMeta } from "@/lib/meta";
import { pairs } from "@/lib/mock-data";
import { PageHeader, Panel, MetricCard, StatusBadge, Seg, Disclaimer, EvidenceButton, chartTooltipStyle, axisProps } from "@/components/cdi/ui";

export const Route = createFileRoute("/strategy-lab")({
  head: () => pageMeta("Strategy Laboratory", "Walk-forward backtesting workspace for relative-value research."),
  component: StrategyLab,
});

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function runBacktest(seed: number, entry: number, cost: number) {
  const r = rng(seed);
  let eq = 100, bench = 100, peak = 100;
  const curve: { i: number; label: string; equity: number; bench: number; dd: number; oos: boolean }[] = [];
  const edge = 0.09 - Math.abs(entry - 1.8) * 0.06 - cost * 0.012;
  for (let i = 0; i < 160; i++) {
    eq *= 1 + (r() - 0.5) * 0.012 + edge / 100;
    bench *= 1 + (r() - 0.49) * 0.009;
    peak = Math.max(peak, eq);
    curve.push({ i, label: `S${i + 1}`, equity: +eq.toFixed(2), bench: +bench.toFixed(2), dd: +(((eq - peak) / peak) * 100).toFixed(2), oos: i >= 112 });
  }
  const trades = Array.from({ length: 14 }, (_, k) => {
    const gross = Math.round((r() - 0.38) * 900 * (entry / 1.8));
    const fees = Math.round(40 + cost * 22);
    return { id: k + 1, entry: `S${k * 11 + 3}`, exit: `S${k * 11 + 3 + Math.ceil(r() * 8)}`, side: r() > 0.5 ? "Long spread" : "Short spread", zIn: +(entry + r() * 0.6).toFixed(2), zOut: +(r() * 0.5).toFixed(2), gross, fees, net: gross - fees };
  });
  const rets = curve.slice(1).map((c, i) => c.equity / curve[i]!.equity - 1);
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length);
  const down = Math.sqrt(rets.filter((x) => x < 0).reduce((a, b) => a + b * b, 0) / rets.length);
  const maxDD = Math.min(...curve.map((c) => c.dd));
  const wins = trades.filter((t) => t.net > 0);
  const losses = trades.filter((t) => t.net <= 0);
  const ann = (Math.pow(eq / 100, 252 / 160) - 1) * 100;
  return {
    curve, trades,
    sharpe: (mean / sd) * Math.sqrt(252), sortino: (mean / (down || 1)) * Math.sqrt(252), ann, maxDD,
    calmar: ann / Math.abs(maxDD || 1), win: (wins.length / trades.length) * 100,
    pf: wins.reduce((a, t) => a + t.net, 0) / Math.max(1, Math.abs(losses.reduce((a, t) => a + t.net, 0))),
  };
}

function StrategyLab() {
  const [pairId, setPairId] = useState(pairs[0]!.id);
  const [entry, setEntry] = useState(1.8);
  const [cost, setCost] = useState("base");
  const [split, setSplit] = useState("70");
  const [filter, setFilter] = useState("all");
  const costMult = cost === "low" ? 0.5 : cost === "high" ? 2 : 1;
  const pair = pairs.find((p) => p.id === pairId)!;
  const res = useMemo(() => runBacktest(pairId.charCodeAt(1) * 97 + 11, entry, costMult), [pairId, entry, costMult]);
  const trades = res.trades.filter((t) => filter === "all" || (filter === "win" ? t.net > 0 : t.net <= 0));
  const stability = [1.2, 1.5, 1.8, 2.1, 2.4].map((e) => {
    const b = runBacktest(pairId.charCodeAt(1) * 97 + 11, e, costMult);
    return { e, is: b.sharpe * 1.25, oos: b.sharpe };
  });

  return (
    <>
      <PageHeader eyebrow="06 · Strategy Lab" title="Strategy Laboratory" subtitle="Walk-forward backtests of relative-value rules, net of costs, with out-of-sample checks." right={<EvidenceButton subject="Backtest configuration" />} />

      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        <Panel title="Experiment setup" subtitle="Changes re-run the backtest instantly">
          <div className="space-y-4 text-sm">
            <label className="block">
              <span className="text-xs text-muted-foreground">Pair</span>
              <select value={pairId} onChange={(e) => setPairId(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs">
                {pairs.map((p) => <option key={p.id} value={p.id}>{p.source} / {p.target}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Entry threshold |z| ≥ <b className="font-mono text-foreground">{entry.toFixed(1)}</b></span>
              <input type="range" min={1} max={3} step={0.1} value={entry} onChange={(e) => setEntry(+e.target.value)} className="mt-1 w-full accent-[var(--primary)]" />
            </label>
            <Seg label="Cost model" value={cost} onChange={setCost} options={[{ value: "low", label: "Low" }, { value: "base", label: "Base" }, { value: "high", label: "Stress" }]} />
            <Seg label="In-sample split" value={split} onChange={setSplit} options={[{ value: "60", label: "60%" }, { value: "70", label: "70%" }, { value: "80", label: "80%" }]} />
            <div className="rounded-md border border-border p-3 font-mono text-[11px] leading-5 text-muted-foreground">
              Window: {pair.window}<br />Exit: |z| ≤ 0.3 or 10 sessions<br />Stop: |z| ≥ {(entry + 1.5).toFixed(1)}<br />Roll guard: exit before last safe date
            </div>
          </div>
        </Panel>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <MetricCard label="Sharpe" value={res.sharpe.toFixed(2)} tone={res.sharpe > 1 ? "success" : res.sharpe > 0 ? "warning" : "danger"} />
            <MetricCard label="Sortino" value={res.sortino.toFixed(2)} />
            <MetricCard label="Annual return" value={`${res.ann.toFixed(1)}%`} tone={res.ann > 0 ? "success" : "danger"} />
            <MetricCard label="Max drawdown" value={`${res.maxDD.toFixed(1)}%`} tone="danger" />
            <MetricCard label="Win rate" value={`${res.win.toFixed(0)}%`} />
            <MetricCard label="Profit factor" value={res.pf.toFixed(2)} sub={`Calmar ${res.calmar.toFixed(2)}`} />
          </div>

          <Panel title="Equity curve" subtitle={`Strategy vs passive benchmark · out-of-sample begins at session ${Math.round(160 * +split / 100)}`}>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={res.curve}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" {...axisProps} interval={19} />
                  <YAxis {...axisProps} domain={["auto", "auto"]} width={40} />
                  <Tooltip {...chartTooltipStyle} />
                  <Line dataKey="equity" name="Strategy" stroke="var(--chart-1)" dot={false} strokeWidth={2} />
                  <Line dataKey="bench" name="Benchmark" stroke="var(--muted-foreground)" dot={false} strokeDasharray="4 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Drawdown" subtitle="Peak-to-trough decline, %">
            <div className="h-36">
              <ResponsiveContainer>
                <AreaChart data={res.curve}>
                  <XAxis dataKey="label" {...axisProps} interval={19} />
                  <YAxis {...axisProps} width={40} />
                  <Tooltip {...chartTooltipStyle} />
                  <Area dataKey="dd" name="Drawdown %" stroke="var(--destructive)" fill="var(--destructive)" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_340px]">
        <Panel title="Trade ledger" subtitle="All figures in ₹, net of fees and slippage" actions={<Seg label="Filter" value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "win", label: "Winners" }, { value: "loss", label: "Losers" }]} />}>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead className="text-left text-muted-foreground">
                <tr>{["#", "Entry", "Exit", "Side", "z in", "z out", "Gross", "Fees", "Net"].map((h) => <th key={h} className="px-2 py-2 font-normal">{h}</th>)}</tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-2 py-1.5">{t.id}</td><td className="px-2">{t.entry}</td><td className="px-2">{t.exit}</td><td className="px-2">{t.side}</td>
                    <td className="px-2">{t.zIn}</td><td className="px-2">{t.zOut}</td><td className="px-2">{t.gross}</td><td className="px-2">{t.fees}</td>
                    <td className="px-2"><StatusBadge tone={t.net > 0 ? "success" : "danger"} dot={false}>{t.net}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Walk-forward stability" subtitle="Sharpe in-sample vs out-of-sample by entry threshold">
          <div className="space-y-2 font-mono text-xs">
            {stability.map((s) => {
              const decay = s.is !== 0 ? (1 - s.oos / s.is) * 100 : 0;
              return (
                <div key={s.e} className="grid grid-cols-4 items-center gap-2 border-b border-border py-1.5">
                  <span>|z| {s.e.toFixed(1)}</span><span>IS {s.is.toFixed(2)}</span><span>OOS {s.oos.toFixed(2)}</span>
                  <StatusBadge tone={s.oos > 0.8 ? "success" : s.oos > 0 ? "warning" : "danger"} dot={false}>{decay.toFixed(0)}% decay</StatusBadge>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
      <Disclaimer>Backtests use simulated sample data. Past simulated performance does not indicate future results and is not investment advice.</Disclaimer>
    </>
  );
}
