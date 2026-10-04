import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ReactFlow, Background, Controls, Handle, Position, BaseEdge, EdgeLabelRenderer, getStraightPath, type EdgeProps, type NodeProps, type Node, type Edge } from "@xyflow/react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";
import { pageMeta } from "@/lib/meta";
import { contracts, contractById, fmtINR, normalize, pairs, signed, type Pair } from "@/lib/mock-data";
import { PageHeader, Panel, StatusBadge, statusTone, EvidenceButton, Disclaimer } from "@/components/cdi/ui";
import { useContractDrawer } from "@/components/cdi/drawers";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fair-value")({
  head: () => pageMeta("Fair Value Graph", "Interactive relationship graph of MCX gold contracts with residuals, z-scores, correlation and expiry compatibility."),
  component: FairValuePage,
});

type CNode = Node<{ id: string }, "contract">;
type PEdge = Edge<{ pair: Pair; selected: boolean }, "pair">;

function ContractNode({ data }: NodeProps<CNode>) {
  const c = contractById(data.id);
  return (
    <div className="w-[168px] rounded-lg border border-border-strong bg-panel p-3 shadow-xl transition-colors hover:border-primary/60">
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold"><span className="size-2 rounded-full" style={{ background: c.color }} />{c.id}</span>
        <StatusBadge tone={statusTone(c.status)} dot={false} className="px-1 text-[9px]">{c.status}</StatusBadge>
      </div>
      <div className="num mt-0.5 text-[10px] text-muted-foreground">{c.expiry.slice(3)}</div>
      <div className="num mt-2 text-sm font-semibold">{fmtINR(normalize(c))}</div>
      <div className="text-[10px] text-muted-foreground">₹/10 g normalized</div>
    </div>
  );
}

function PairEdge({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps<PEdge>) {
  const [path, lx, ly] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  const p = data!.pair;
  const strength = Math.min(Math.abs(p.z) / 2.5, 1);
  const color = Math.abs(p.z) >= 2 ? "var(--warning)" : p.liquidity === "FAIL" ? "var(--destructive)" : "var(--primary)";
  return (
    <>
      <BaseEdge id={id} path={path} style={{ stroke: color, strokeWidth: 1 + strength * 4, opacity: data!.selected ? 1 : 0.35 + strength * 0.5 }} />
      <EdgeLabelRenderer>
        <div
          style={{ transform: `translate(-50%,-50%) translate(${lx}px,${ly}px)` }}
          className={cn("nodrag nopan pointer-events-auto absolute cursor-pointer rounded border bg-background/95 px-1.5 py-0.5 text-[10px] num", data!.selected ? "border-primary" : "border-border-strong")}
        >
          <span style={{ color }}>{p.z > 0 ? "+" : ""}{p.z.toFixed(2)}σ</span>
          <span className="ml-1 text-muted-foreground">ρ{p.corr}</span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = { contract: ContractNode };
const edgeTypes = { pair: PairEdge };
const positions: Record<string, { x: number; y: number }> = {
  GOLDM: { x: 260, y: 0 }, GOLDTEN: { x: 0, y: 200 }, GOLDGUINEA: { x: 520, y: 200 }, GOLDPETAL: { x: 260, y: 400 },
};

function Graph({ selected, onEdge, onNode }: { selected: string; onEdge: (id: string) => void; onNode: (id: string) => void }) {
  const nodes: CNode[] = useMemo(() => contracts.map((c) => ({ id: c.id, type: "contract", position: positions[c.id]!, data: { id: c.id } })), []);
  const edges: PEdge[] = pairs.map((p) => ({ id: p.id, source: p.source, target: p.target, type: "pair", data: { pair: p, selected: p.id === selected } }));
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      onEdgeClick={(_, e) => onEdge(e.id)}
      onNodeClick={(_, n) => onNode(n.id)}
      proOptions={{ hideAttribution: true }}
      nodesConnectable={false}
    >
      <Background color="var(--border-strong)" gap={24} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

function Row({ k, v, tone }: { k: string; v: React.ReactNode; tone?: string | undefined }) {
  return (
    <div className="flex items-baseline justify-between border-b py-1.5 text-xs last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className={cn("num", tone)}>{v}</span>
    </div>
  );
}

function PairPanel({ pair }: { pair: Pair }) {
  const [explain, setExplain] = useState(false);
  const a = contractById(pair.source), b = contractById(pair.target);
  const actual = Math.round(normalize(a) - normalize(b));
  const fair = actual - pair.residual;
  return (
    <Panel title="Pair analysis" subtitle={`${pair.source} ↔ ${pair.target}`} evidence={`Pair ${pair.source}/${pair.target}`}>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {[["Fair value", signed(fair)], ["Actual", signed(actual)], ["Residual", signed(pair.residual)]].map(([k, v]) => (
          <div key={k} className="rounded-md border bg-background/40 p-2">
            <div className="label-xs text-[9.5px]">{k}</div>
            <div className="num mt-0.5 text-sm font-semibold">{v}</div>
          </div>
        ))}
      </div>
      <Row k="Z-score" v={`${pair.z > 0 ? "+" : ""}${pair.z.toFixed(2)}σ`} tone={Math.abs(pair.z) >= 2 ? "text-warning" : undefined} />
      <Row k="Correlation" v={pair.corr} />
      <Row k="Training window" v={pair.window} />
      <Row k="Sample size" v={`n = ${pair.n}`} />
      <Row k="Uncertainty (1σ)" v={`± ${fmtINR(pair.unc)}`} />
      <Row k="Liquidity" v={<StatusBadge tone={statusTone(pair.liquidity)}>{pair.liquidity}</StatusBadge>} />
      <Row k="Expiry compatibility" v={<StatusBadge tone={pair.expiry === "Compatible" ? "success" : "warning"}>{pair.expiry}</StatusBadge>} />
      <Row k="Quality flags" v={pair.liquidity === "FAIL" ? "LOW_VOLUME" : "none"} />
      <button onClick={() => setExplain((e) => !e)} aria-expanded={explain} className="mt-3 flex w-full items-center justify-between rounded-md border bg-background/40 px-3 py-2 text-xs font-medium hover:border-border-strong">
        <span className="flex items-center gap-2"><Sparkles className="size-3.5 text-primary" /> Explain this relationship</span>
        <ChevronDown className={cn("size-4 transition-transform", explain && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {explain && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="pt-3 text-xs leading-relaxed text-muted-foreground">
              After normalizing both contracts to ₹ per 10 g of pure gold, {pair.source} trades {fmtINR(Math.abs(pair.residual))} {pair.residual > 0 ? "above" : "below"} what the
              rolling robust regression predicts from {pair.target}. That is {Math.abs(pair.z).toFixed(2)} standard deviations from typical behaviour over {pair.window}.
              {Math.abs(pair.z) < 2 ? " This is within the normal range and does not meet the 2σ evidence threshold." : " This exceeds the 2σ threshold, but costs, liquidity and expiry must still be checked before it counts as evidence."}
              {pair.expiry !== "Compatible" && " The two contracts have different expiries, so part of the gap may reflect carry rather than mispricing."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  );
}

function FairValuePage() {
  const [sel, setSel] = useState("e1");
  const openContract = useContractDrawer();
  const pair = pairs.find((p) => p.id === sel)!;
  return (
    <>
      <PageHeader eyebrow="02 · Fair Value" title="Fair Value Graph" subtitle="Relationships between compatible contracts. Edge thickness reflects deviation strength." right={<EvidenceButton subject="Fair value model" />} />
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Panel title="Contract relationship network" subtitle="Click an edge for pair analysis, a node for contract detail" bodyClassName="p-0">
          <div className="h-[540px]">
            <ClientOnly fallback={<Skeleton className="m-4 h-[500px]" />}>
              <Graph selected={sel} onEdge={setSel} onNode={openContract} />
            </ClientOnly>
          </div>
          <div className="flex flex-wrap items-center gap-4 border-t px-4 py-2.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-primary" /> within threshold</span>
            <span className="flex items-center gap-1.5"><span className="h-1 w-5 bg-warning" /> |z| ≥ 2σ</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-destructive" /> liquidity fail</span>
          </div>
        </Panel>
        <div className="space-y-5">
          <PairPanel pair={pair} />
          <Panel title="All pairs" bodyClassName="p-0">
            <table className="w-full text-xs">
              <thead><tr className="label-xs text-left"><th className="px-4 py-2 font-medium">Pair</th><th className="px-2 py-2 text-right font-medium">z</th><th className="px-4 py-2 text-right font-medium">Liq.</th></tr></thead>
              <tbody>
                {pairs.map((p) => (
                  <tr key={p.id} onClick={() => setSel(p.id)} className={cn("cursor-pointer border-t transition-colors hover:bg-accent/50", p.id === sel && "bg-accent/60")}>
                    <td className="px-4 py-2">{p.source} / {p.target}</td>
                    <td className={cn("num px-2 py-2 text-right", Math.abs(p.z) >= 2 && "text-warning")}>{p.z.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right"><StatusBadge tone={statusTone(p.liquidity)} dot={false}>{p.liquidity}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <Disclaimer>Settlement-price gaps are not guaranteed arbitrage. Residuals describe statistical deviation only.</Disclaimer>
        </div>
      </div>
    </>
  );
}
