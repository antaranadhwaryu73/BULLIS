import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Check, FileSearch, Info, X, CircleSlash } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEvidence } from "./drawers";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const toneCls: Record<Tone, string> = {
  success: "text-success bg-success/10 border-success/25",
  warning: "text-warning bg-warning/10 border-warning/25",
  danger: "text-destructive bg-destructive/10 border-destructive/25",
  info: "text-primary bg-primary/10 border-primary/25",
  neutral: "text-muted-foreground bg-muted border-border-strong",
};
export const toneText: Record<Tone, string> = {
  success: "text-success", warning: "text-warning", danger: "text-destructive", info: "text-primary", neutral: "text-muted-foreground",
};
export const toneVar: Record<Tone, string> = {
  success: "var(--success)", warning: "var(--warning)", danger: "var(--destructive)", info: "var(--primary)", neutral: "var(--muted-foreground)",
};

export function StatusBadge({ tone = "neutral", children, dot = true, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-[10.5px] font-semibold tracking-wider uppercase", toneCls[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export const statusTone = (s: string): Tone =>
  ({ SAFE: "success", PASS: "success", VALID: "success", ok: "success", WATCH: "warning", warn: "warning", Medium: "warning", RESTRICTED: "danger", FAIL: "danger", High: "danger", Low: "info" } as Record<string, Tone>)[s] ?? "neutral";

export function EvidenceButton({ subject, className }: { subject: string; className?: string }) {
  const open = useEvidence();
  return (
    <button
      onClick={() => open(subject)}
      aria-label={`View evidence for ${subject}`}
      className={cn("inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", className)}
    >
      <FileSearch className="size-3.5" /> Evidence
    </button>
  );
}

export function Panel({ title, subtitle, actions, children, className, evidence, bodyClassName }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; evidence?: string; bodyClassName?: string }) {
  return (
    <section className={cn("panel flex flex-col", className)}>
      {(title || actions || evidence) && (
        <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-[13px] font-semibold tracking-tight">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {actions}
            {evidence && <EvidenceButton subject={evidence} />}
          </div>
        </header>
      )}
      <div className={cn("flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function MetricCard({ label, value, sub, tone, sparkData, evidence }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; sparkData?: { i: number; v: number }[]; evidence?: string }) {
  const open = useEvidence();
  const color = tone ? toneVar[tone] : "var(--primary)";
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onClick={() => open(evidence ?? label)}
      className="panel group relative overflow-hidden p-3.5 text-left transition-colors hover:border-border-strong"
      aria-label={`${label}: open evidence`}
    >
      <div className="flex items-center justify-between">
        <span className="label-xs">{label}</span>
        <FileSearch className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className={cn("num mt-1.5 text-lg font-semibold tracking-tight", tone && toneText[tone])}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
      {sparkData && (
        <div className="pointer-events-none absolute right-0 bottom-0 h-10 w-24 opacity-70">
          <ResponsiveContainer>
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id={`sg-${label.replace(/\W/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area dataKey="v" stroke={color} strokeWidth={1.25} fill={`url(#sg-${label.replace(/\W/g, "")})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.button>
  );
}

export function PageHeader({ eyebrow, title, subtitle, right }: { eyebrow: string; title: string; subtitle: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="label-xs text-primary">{eyebrow}</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {right}
    </div>
  );
}

export function NoSignalPanel({ reasons, compact }: { reasons: { ok: boolean; text: string }[]; compact?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border-strong bg-panel p-4">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-md border border-border-strong bg-muted">
          <CircleSlash className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold tracking-wide">NO ACTIONABLE SIGNAL</h3>
            <StatusBadge tone="neutral" dot={false}>Evidence threshold not met</StatusBadge>
          </div>
          {!compact && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              The observed deviation does not currently clear the required evidence threshold. This is an informative result, not an error.
            </p>
          )}
          <ul className="mt-3 space-y-1.5">
            {reasons.map((r) => (
              <li key={r.text} className="flex items-center gap-2 text-xs">
                {r.ok ? (
                  <Check className="size-3.5 shrink-0 text-success" aria-label="passed" />
                ) : (
                  <X className="size-3.5 shrink-0 text-destructive" aria-label="failed" />
                )}
                <span className={r.ok ? "text-muted-foreground" : "text-foreground"}>{r.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function Disclaimer({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 size-3 shrink-0" /> {children}
    </p>
  );
}

export function Seg<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border bg-background/40 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("rounded px-2 py-1 text-[11px] font-medium transition-colors", value === o.value ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const chartTooltipStyle = {
  contentStyle: { background: "var(--popover)", border: "1px solid var(--border-strong)", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-mono)" },
  labelStyle: { color: "var(--muted-foreground)" },
  itemStyle: { padding: 0 },
};
export const axisProps = { stroke: "var(--muted-foreground)", fontSize: 10, tickLine: false, axisLine: false } as const;
