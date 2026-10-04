import { createContext, useContext, useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { contractById, fmtINR, normalize, type Contract } from "@/lib/mock-data";
import { toast } from "sonner";
import { Code2, FileText, History } from "lucide-react";

interface Ctx { openEvidence: (s: string) => void; openContract: (id: string) => void }
const DrawerCtx = createContext<Ctx>({ openEvidence: () => {}, openContract: () => {} });
export const useEvidence = () => useContext(DrawerCtx).openEvidence;
export const useContractDrawer = () => useContext(DrawerCtx).openContract;

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2 text-xs last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="num text-right">{v}</span>
    </div>
  );
}

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [evidence, setEvidence] = useState<string | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  return (
    <DrawerCtx.Provider value={{ openEvidence: setEvidence, openContract: (id) => setContract(contractById(id)) }}>
      {children}
      <Sheet open={!!evidence} onOpenChange={(o) => !o && setEvidence(null)}>
        <SheetContent className="w-full overflow-y-auto border-border-strong bg-panel sm:max-w-md">
          <SheetHeader>
            <div className="label-xs text-primary">Audit trail</div>
            <SheetTitle>{evidence}</SheetTitle>
            <SheetDescription>Where did this number come from?</SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-4 pb-6">
            <div>
              <div className="label-xs mb-1">Provenance</div>
              <Row k="Source file" v="MCX_BhavCopy_20260930.csv" />
              <Row k="Source rows" v="#1184, #1187, #1203, #1211" />
              <Row k="Specification version" v="MCX-SPEC-GM-2026.2" />
              <Row k="Data snapshot" v="snap_2026-09-30T18:42Z" />
              <Row k="Checksum" v="sha256:9f3a…c41e" />
            </div>
            <div>
              <div className="label-xs mb-1">Model</div>
              <Row k="Model version" v="rrr-fv v2.3.0" />
              <Row k="Estimator" v="Rolling Robust Regression (Huber)" />
              <Row k="Training window" v="120 sessions" />
              <Row k="Parameters" v="δ=1.35, min_n=80, z_thr=2.0" />
              <Row k="Calculation timestamp" v="30 SEP 2026 18:44:12 IST" />
            </div>
            <div className="rounded-md border bg-background/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
              Values are computed from end-of-day settlement prices, which are a <span className="text-foreground">mark</span>, not an
              executable price. Executable-price proxies apply a spread and slippage assumption.
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={!!contract} onOpenChange={(o) => !o && setContract(null)}>
        <SheetContent className="w-full overflow-y-auto border-border-strong bg-panel sm:max-w-md">
          {contract && (
            <>
              <SheetHeader>
                <div className="label-xs text-primary">Contract detail</div>
                <SheetTitle className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: contract.color }} />
                  {contract.id} · {contract.expiry}
                </SheetTitle>
                <SheetDescription>{contract.name}</SheetDescription>
              </SheetHeader>
              <div className="space-y-5 px-4 pb-6">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border bg-background/40 p-3">
                    <div className="label-xs">Raw price</div>
                    <div className="num mt-1 text-lg font-semibold">{fmtINR(contract.rawPrice)}</div>
                    <div className="text-[11px] text-muted-foreground">{contract.quoteBasis}</div>
                  </div>
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                    <div className="label-xs">Normalized</div>
                    <div className="num mt-1 text-lg font-semibold text-primary">{fmtINR(normalize(contract))}</div>
                    <div className="text-[11px] text-muted-foreground">₹ / 10 g pure gold</div>
                  </div>
                </div>
                <div className="rounded-md border bg-background/50 p-3">
                  <div className="label-xs mb-2">Normalization formula</div>
                  <div className="num text-sm">Normalized = P × (10 / Q) × (1 / F)</div>
                  <div className="num mt-2 text-xs text-muted-foreground">
                    = {contract.rawPrice.toLocaleString("en-IN")} × (10 / {contract.q}) × (1 / {contract.purity})
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                    <div><span className="text-muted-foreground">P</span> raw quote</div>
                    <div><span className="text-muted-foreground">Q</span> {contract.q} g basis</div>
                    <div><span className="text-muted-foreground">F</span> fineness {contract.purity}</div>
                  </div>
                </div>
                <div>
                  <div className="label-xs mb-1">Specification</div>
                  <Row k="Symbol" v={contract.id} />
                  <Row k="Trading unit" v={contract.tradingUnit} />
                  <Row k="Quote basis" v={contract.quoteBasis} />
                  <Row k="Purity" v={contract.purity} />
                  <Row k="Tick size" v={contract.tickSize} />
                  <Row k="Listing date" v={contract.listingDate} />
                  <Row k="Last trading date" v={contract.lastTradingDate} />
                  <Row k="Tender period" v={`${contract.tenderStart} → ${contract.lastTradingDate}`} />
                  <Row k="Delivery" v={contract.deliveryDate} />
                  <Row k="Specification version" v={contract.specVersion} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: FileText, l: "View Source" },
                    { icon: Code2, l: "View Calculation" },
                    { icon: History, l: "View Audit Trail" },
                  ].map(({ icon: I, l }) => (
                    <button
                      key={l}
                      onClick={() => { setContract(null); setEvidence(`${contract.id} · ${l.replace("View ", "")}`); }}
                      className="flex flex-col items-center gap-1.5 rounded-md border bg-background/40 p-2.5 text-[11px] transition-colors hover:border-border-strong hover:bg-accent"
                    >
                      <I className="size-4 text-muted-foreground" /> {l}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </DrawerCtx.Provider>
  );
}

export const notify = (m: string) => toast(m);
