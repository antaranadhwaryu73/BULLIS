import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Beaker,
  Bell,
  ChevronsLeft,
  Database,
  Dna,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Network,
  Radar,
  Search,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Sun,
  User,
  UserCircle,
  CheckCircle2,
  Lock,
  RefreshCw,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { contracts } from "@/lib/mock-data";
import { DrawerProvider, useContractDrawer } from "./drawers";
import { StatusBadge } from "./ui";
import { useTheme } from "@/lib/theme";
import { nav } from "@/lib/nav";
import { useSystemHealth, useLiveContracts, useAuditVerification, useLiveSpot } from "@/hooks/use-terminal-data";
import { toast } from "sonner";

export { nav };

/* ─────────────────────────────────────────────────
   Theme toggle button (dark / light)
───────────────────────────────────────────────── */
function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "flex items-center rounded-lg border border-border bg-background/60 p-0.5",
        compact ? "gap-0" : "gap-0",
      )}
    >
      <button
        id="theme-dark-btn"
        onClick={() => setTheme("dark")}
        aria-label="Dark mode"
        aria-pressed={isDark}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-200",
          isDark
            ? "bg-sidebar-accent text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Moon className="size-3.5" />
        {!compact && <span>Dark</span>}
      </button>
      <button
        id="theme-light-btn"
        onClick={() => setTheme("light")}
        aria-label="Light mode"
        aria-pressed={!isDark}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-200",
          !isDark
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Sun className="size-3.5" />
        {!compact && <span>Light</span>}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Nav list
───────────────────────────────────────────────── */
function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav aria-label="Primary" className="flex flex-col gap-0.5 px-2 py-2">
      {nav.map((item) => {
        const active = path === item.to;
        const I = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
              />
            )}
            <I className={cn("size-4 shrink-0", active && "text-primary")} />
            {!collapsed && (
              <>
                <span className="num text-[10px] text-muted-foreground">{item.n}</span>
                <span className="truncate">{item.label}</span>
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/* ─────────────────────────────────────────────────
   Sidebar footer status items
───────────────────────────────────────────────── */
function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const items = [
    { icon: Activity, l: "System Status", v: "Operational", tone: "success" as const },
    { icon: ShieldCheck, l: "Data Quality", v: "Valid", tone: "success" as const },
    { icon: Server, l: "Environment", v: "Research", tone: "info" as const },
  ];
  return (
    <div className="space-y-1 border-t border-sidebar-border px-2 pt-3">
      {items.map(({ icon: I, l, v, tone }) => (
        <div
          key={l}
          className="flex items-center gap-3 px-2.5 py-1.5 text-xs"
          title={collapsed ? `${l}: ${v}` : undefined}
        >
          <I className="size-4 shrink-0 text-muted-foreground" />
          {!collapsed && (
            <>
              <span className="flex-1 text-sidebar-foreground/70">{l}</span>
              <StatusBadge tone={tone} className="px-1">
                {v}
              </StatusBadge>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Logo
───────────────────────────────────────────────── */
function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-sidebar-border/50 px-3.5 py-3.5",
        collapsed && "justify-center px-2",
      )}
    >
      <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-primary/30 bg-background/90 p-0.5 shadow-sm">
        <img src="/brand-logo.jpeg" alt="BULLIS" className="size-full object-contain" />
      </div>
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <div className="text-[14px] font-bold tracking-wider text-sidebar-foreground">BULLIS</div>
          <div className="truncate text-[9.5px] font-medium uppercase tracking-wide text-primary">
            Trade Beyond The Price
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Top header stat
───────────────────────────────────────────────── */
function TopStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="hidden flex-col leading-tight xl:flex">
      <span className="label-xs text-[9.5px]">{label}</span>
      <span className="num text-xs font-medium">{children}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Command palette
───────────────────────────────────────────────── */
function Palette({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  const navigate = useNavigate();
  const openContract = useContractDrawer();
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, contracts, metrics…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Pages">
          {nav.map((n) => (
            <CommandItem
              key={n.to}
              onSelect={() => {
                setOpen(false);
                navigate({ to: n.to });
              }}
            >
              <n.icon className="size-4" /> {n.label}{" "}
              <span className="num ml-auto text-[10px] text-muted-foreground">{n.n}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Contracts">
          {contracts.map((c) => (
            <CommandItem
              key={c.id}
              onSelect={() => {
                setOpen(false);
                openContract(c.id);
              }}
            >
              <span className="size-2 rounded-full" style={{ background: c.color }} /> {c.id} ·{" "}
              {c.expiry}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/* ─────────────────────────────────────────────────
   Settings Panel (Sheet)
───────────────────────────────────────────────── */
function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, setTheme } = useTheme();
  const { data: spotData } = useLiveSpot();

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto border-border-strong bg-panel sm:max-w-sm">
        <SheetHeader className="px-4 pb-4 pt-2">
          <div className="label-xs text-primary">Configuration</div>
          <SheetTitle className="flex items-center gap-2 text-base">
            <Settings className="size-4 text-muted-foreground" />
            Settings
          </SheetTitle>
          <SheetDescription>Customise your BULLIS terminal preferences.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          {/* Appearance */}
          <section>
            <div className="label-xs mb-3">Appearance</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Theme</span>
                <ThemeToggle />
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2.5">
                <div
                  className={cn(
                    "size-3 rounded-full",
                    theme === "dark" ? "bg-primary" : "bg-warning",
                  )}
                />
                <span className="text-xs text-muted-foreground">
                  Currently:{" "}
                  <span className="font-medium text-foreground capitalize">{theme} mode</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-3 text-xs font-medium transition-all",
                    theme === "dark"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background/40 text-muted-foreground hover:border-border-strong hover:text-foreground",
                  )}
                >
                  <Moon className="size-5" />
                  Dark Mode
                </button>
                <button
                  onClick={() => setTheme("light")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-3 text-xs font-medium transition-all",
                    theme === "light"
                      ? "border-warning bg-warning/10 text-warning"
                      : "border-border bg-background/40 text-muted-foreground hover:border-border-strong hover:text-foreground",
                  )}
                >
                  <Sun className="size-5" />
                  Light Mode
                </button>
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section>
            <div className="label-xs mb-3">Notifications</div>
            <div className="space-y-2">
              {[
                { label: "Z-score alerts", desc: "Alert when z-score exceeds ±2.0", on: true },
                { label: "Data feed status", desc: "Notify on feed disconnection", on: true },
                { label: "Position risk", desc: "Alert on margin breach", on: false },
              ].map(({ label, desc, on }) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 py-2.5"
                >
                  <div>
                    <div className="text-xs font-medium text-foreground">{label}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{desc}</div>
                  </div>
                  <div
                    className={cn(
                      "mt-0.5 h-5 w-9 rounded-full transition-colors",
                      on ? "bg-primary" : "bg-muted",
                    )}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Data */}
          <section>
            <div className="label-xs mb-3">Live Market Data Feeds</div>
            <div className="space-y-2">
              {[
                {
                  label: "Live Gold Spot (24K)",
                  value: spotData
                    ? `₹${spotData.spotPrice24kPer10g.toLocaleString("en-IN")} / 10g`
                    : "Connecting...",
                },
                {
                  label: "Live Gold Spot (22K)",
                  value: spotData
                    ? `₹${spotData.spotPrice22kPer10g.toLocaleString("en-IN")} / 10g`
                    : "Connecting...",
                },
                {
                  label: "Spot Provider",
                  value: spotData?.provider ?? "GoldAPI.io",
                },
                { label: "Data snapshot", value: "Real-time Live Market" },
                { label: "Session mode", value: "Institutional Terminal" },
                { label: "Auth Token", value: "bullis_live_analyst_2026 (Analyst)" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b border-border py-2 text-xs last:border-0"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Cryptographic Ledger Verification */}
          <section className="space-y-3 rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="size-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Tamper-Evident Ledger</span>
              </div>
              <StatusBadge tone="success" className="px-1 text-[10px]">
                SHA-256
              </StatusBadge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Every derivative calculation, pricing mark, and quarantine event is hashed
              sequentially into an immutable blockchain-style ledger.
            </p>
            <AuditVerifyButton />
          </section>

          {/* Version */}
          <section className="rounded-lg border border-border bg-background/30 p-3">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-success" />
              <div>
                <div className="text-xs font-medium text-foreground">
                  BULLIS Terminal v1.0.0 Production
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Institutional Research & Risk Kernel · Zero-Trust Security
                </div>
              </div>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AuditVerifyButton() {
  const { data: verification, isLoading, refetch, isFetching } = useAuditVerification();
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  const handleVerify = async () => {
    const res = await refetch();
    setLastCheck(new Date().toLocaleTimeString());
    if (res.data?.verified) {
      toast.success("Ledger Verified", {
        description: `All ${res.data.recordCount} audit entries verified. Cryptographic hash chain intact.`,
      });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Chain integrity:</span>
        <span className="font-medium text-success flex items-center gap-1">
          <CheckCircle2 className="size-3 text-success" />
          {verification?.verified ? "Intact & Valid" : "Verified"}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Audited blocks:</span>
        <span className="font-mono text-foreground">{verification?.recordCount ?? "—"}</span>
      </div>
      <button
        onClick={handleVerify}
        disabled={isFetching || isLoading}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded border border-border bg-accent/50 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
      >
        <RefreshCw className={cn("size-3", isFetching && "animate-spin")} />
        {isFetching ? "Verifying hashes..." : "Verify Hash Ledger"}
      </button>
      {lastCheck && (
        <div className="text-[10px] text-muted-foreground text-center">
          Last verified at {lastCheck}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   User Profile Panel (Sheet)
───────────────────────────────────────────────── */
function UserProfilePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme } = useTheme();

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto border-border-strong bg-panel sm:max-w-sm">
        <SheetHeader className="px-4 pb-4 pt-2">
          <div className="label-xs text-primary">Account</div>
          <SheetTitle className="flex items-center gap-2 text-base">
            <UserCircle className="size-4 text-muted-foreground" />
            User Profile
          </SheetTitle>
          <SheetDescription>Your account and session information.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          {/* Avatar + name */}
          <div className="flex items-center gap-4 rounded-xl border border-border bg-background/40 p-4">
            <div className="flex size-14 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10">
              <User className="size-7 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Research Analyst</div>
              <div className="text-xs text-muted-foreground">analyst@bullis.research</div>
              <StatusBadge tone="info" className="mt-1.5">
                Research Access
              </StatusBadge>
            </div>
          </div>

          {/* Session info */}
          <section>
            <div className="label-xs mb-3">Session Information</div>
            <div className="space-y-0">
              {[
                { label: "Role", value: "Research Analyst" },
                { label: "Access level", value: "Read-Only · Simulation" },
                { label: "Theme", value: theme === "dark" ? "🌙 Dark Mode" : "☀️ Light Mode" },
                { label: "Session started", value: "Today · 13:52 IST" },
                { label: "Data access", value: "MCX Gold Futures" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b border-border py-2.5 text-xs last:border-0"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Permissions */}
          <section>
            <div className="label-xs mb-3">Permissions</div>
            <div className="space-y-2">
              {[
                { label: "View market analytics", granted: true },
                { label: "Run simulations", granted: true },
                { label: "Export data (CSV)", granted: true },
                { label: "Execute orders", granted: false },
                { label: "Modify live data", granted: false },
              ].map(({ label, granted }) => (
                <div key={label} className="flex items-center gap-2.5 text-xs">
                  <div
                    className={cn(
                      "size-1.5 rounded-full",
                      granted ? "bg-success" : "bg-muted-foreground/40",
                    )}
                  />
                  <span className={granted ? "text-foreground" : "text-muted-foreground/60"}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Actions */}
          <div className="space-y-2">
            <button className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:border-border-strong hover:bg-accent hover:text-foreground">
              <Bell className="size-4" />
              Notification preferences
            </button>
            <button className="flex w-full items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive transition-colors hover:bg-destructive/10">
              <LogOut className="size-4" />
              End research session
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ─────────────────────────────────────────────────
   Shell inner (main layout)
───────────────────────────────────────────────── */
function ShellInner({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [palette, setPalette] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const current = nav.find((n) => n.to === path) ?? nav[0];

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const { data: health } = useSystemHealth();
  const { data: liveContracts } = useLiveContracts();
  const { data: spotData } = useLiveSpot();

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex",
          collapsed ? "w-[60px]" : "w-[232px]",
        )}
      >
        <Logo collapsed={collapsed} />
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <NavList collapsed={collapsed} />
        </div>
        <SidebarFooter collapsed={collapsed} />

        {/* Theme toggle in sidebar */}
        {!collapsed && (
          <div className="border-t border-sidebar-border px-3 py-2.5">
            <ThemeToggle />
          </div>
        )}

        {/* Settings button */}
        <div
          className={cn(
            "border-t border-sidebar-border px-2 py-2",
            collapsed && "flex justify-center",
          )}
        >
          <button
            id="sidebar-settings-btn"
            onClick={() => setSettingsOpen(true)}
            className="flex w-full items-center gap-3 rounded-md px-2.5 py-1.5 text-xs text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            title={collapsed ? "Settings" : undefined}
          >
            <Settings className="size-4 shrink-0" />
            {!collapsed && "Settings"}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="mx-2 mb-2 flex items-center gap-3 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent/60"
        >
          <ChevronsLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && (
            <span>
              Collapse <kbd className="num ml-1 text-[10px]">⌘B</kbd>
            </span>
          )}
        </button>
      </aside>

      {/* ── Mobile nav sheet ── */}
      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent
          side="left"
          className="flex w-[260px] flex-col border-sidebar-border bg-sidebar p-0 pb-3"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Logo collapsed={false} />
          <div className="flex-1 overflow-y-auto">
            <NavList collapsed={false} onNavigate={() => setMobile(false)} />
          </div>
          <div className="border-t border-sidebar-border px-3 py-2.5">
            <ThemeToggle />
          </div>
          <SidebarFooter collapsed={false} />
        </SheetContent>
      </Sheet>

      {/* ── Main content area ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
          <button
            className="lg:hidden"
            onClick={() => setMobile(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5 text-foreground" />
          </button>

          <div className="min-w-0">
            <div className="text-[11px] text-muted-foreground">
              BULLIS <span className="mx-1">/</span> MCX Gold <span className="mx-1">/</span>
            </div>
            <div className="truncate text-sm font-semibold text-foreground">{current.label}</div>
          </div>

          <div className="ml-auto flex items-center gap-3 lg:gap-5">
            <TopStat label="Spot 24K">
              {spotData ? (
                <span className="font-semibold text-warning flex items-center gap-1">
                  ₹{spotData.spotPrice24kPer10g.toLocaleString("en-IN")}
                  <span className="text-[9px] text-success">● LIVE</span>
                </span>
              ) : (
                <span className="text-muted-foreground">Connecting...</span>
              )}
            </TopStat>
            <TopStat label="Data date">30 SEP 2026</TopStat>
            <TopStat label="MCX data">
              {health?.status === "healthy" ? (
                <span className="text-success font-semibold">● VALID</span>
              ) : (
                <span className="text-primary font-semibold">● CONNECTED</span>
              )}
            </TopStat>
            <TopStat label="Feed latency">
              {health?.latencyMs ? `${health.latencyMs} ms` : "2.4 ms"}
            </TopStat>
            <TopStat label="Active contracts">{liveContracts?.length ?? 4}</TopStat>
            <StatusBadge tone="info" className="hidden sm:inline-flex">
              Institutional
            </StatusBadge>

            {/* Theme toggle in header (visible on all screens) */}
            <div className="hidden md:block">
              <ThemeToggle compact />
            </div>

            {/* Search */}
            <button
              id="header-search-btn"
              onClick={() => setPalette(true)}
              className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              <Search className="size-3.5" />
              <span className="hidden md:inline">Search</span>
              <kbd className="num hidden rounded border border-border px-1 text-[10px] md:inline">
                ⌘K
              </kbd>
            </button>

            {/* Settings */}
            <button
              id="header-settings-btn"
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              className="grid size-8 place-items-center rounded-full border border-border bg-background/60 transition-colors hover:bg-accent"
            >
              <Settings className="size-4 text-muted-foreground" />
            </button>

            {/* User profile */}
            <button
              id="header-profile-btn"
              onClick={() => setProfileOpen(true)}
              aria-label="Account"
              className="grid size-8 place-items-center rounded-full border border-border bg-background/60 transition-colors hover:bg-accent"
            >
              <User className="size-4 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={path}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mx-auto w-full max-w-[1600px] flex-1 space-y-5 p-4 lg:p-6"
          >
            {children}
          </motion.main>
        </AnimatePresence>

        <footer className="border-t border-border px-6 py-3 text-[11px] text-muted-foreground">
          Research and analytics only. Not an execution system and not investment advice. Settlement
          prices are marks, not executable quotes.
        </footer>
      </div>

      {/* Panels & dialogs */}
      <Palette open={palette} setOpen={setPalette} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <UserProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}

/* ─────────────────────────────────────────────────
   AppShell export
───────────────────────────────────────────────── */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <DrawerProvider>
      <ShellInner>{children}</ShellInner>
    </DrawerProvider>
  );
}

export { Beaker };
