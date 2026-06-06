/**
 * CommandDashboard — Aggregate readiness view across all saved profiles.
 */
import { useState, useEffect } from "react";
import {
  Users, ShieldCheck, Zap, Activity, RefreshCw,
  Search, Loader2, AlertTriangle, Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { MarineProfile, computeTrend } from "@/lib/storage";
import { apiGetProfiles, apiDeleteProfile } from "@/lib/api";
import { MarineDetailDrawer } from "./MarineDetailDrawer";

// ── Tooltip wrapper ────────────────────────────────────────────────────────────

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="relative group inline-flex items-center">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-md bg-popover border border-border text-[10px] font-normal normal-case tracking-normal leading-relaxed text-popover-foreground shadow-md px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 text-center">
        {text}
      </span>
    </span>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  tooltip,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: "primary" | "yellow" | "red" | "muted";
  tooltip?: string;
}) {
  const colors = {
    primary: { text: "text-primary",     border: "border-primary/30",     bg: "bg-primary/5"     },
    yellow:  { text: "text-yellow-600",  border: "border-yellow-500/30",  bg: "bg-yellow-500/5"  },
    red:     { text: "text-destructive", border: "border-destructive/30", bg: "bg-destructive/5" },
    muted:   { text: "text-foreground",  border: "border-border",         bg: "bg-card"          },
  }[color];

  return (
    <div className={`border rounded-md px-3 py-3 flex flex-col gap-1 ${colors.border} ${colors.bg}`}>
      <div className="flex items-center gap-1.5">
        <span className={colors.text}>{icon}</span>
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
        {tooltip && (
          <Tooltip text={tooltip}>
            <Info className="w-3 h-3 text-muted-foreground/60 cursor-help ml-auto shrink-0" />
          </Tooltip>
        )}
      </div>
      <p className={`text-2xl font-mono font-bold ${colors.text}`}>{value}</p>
      {sub && <p className="text-[9px] text-muted-foreground leading-relaxed">{sub}</p>}
    </div>
  );
}

// ── Risk Badge ────────────────────────────────────────────────────────────────

function RiskBadge({ risk }: { risk: string }) {
  const cfg =
    risk === "In Regs"
      ? "bg-primary/10 text-primary"
      : risk === "Watch Zone"
      ? "bg-yellow-500/10 text-yellow-600"
      : "bg-destructive/10 text-destructive";
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${cfg}`}>
      {risk}
    </span>
  );
}

// ── Trend Pill ────────────────────────────────────────────────────────────────

function TrendPill({ trend }: { trend: "Improving" | "Worsening" | "Stable" | null }) {
  if (!trend) return <span className="text-[11px] font-bold text-muted-foreground/40">—</span>;
  const cfg = {
    Improving: { label: "↓", color: "text-primary" },
    Worsening: { label: "↑", color: "text-destructive" },
    Stable:    { label: "→", color: "text-muted-foreground" },
  }[trend];
  return <span className={`text-[11px] font-bold ${cfg.color}`}>{cfg.label}</span>;
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <Users className="w-10 h-10 text-muted-foreground/40" />
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">No Profiles Yet</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Run an assessment on the Calculator tab and save a profile to populate the dashboard.
        </p>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface CommandDashboardProps {
  onEdit: (profile: MarineProfile) => void;
}

export function CommandDashboard({ onEdit }: CommandDashboardProps) {
  const [profiles, setProfiles] = useState<MarineProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MarineProfile | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await apiGetProfiles();
      setProfiles(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  // ── Aggregate metrics ────────────────────────────────────────────────────────
  const total     = profiles.length;
  const inRegs    = profiles.filter((p) => p.riskLevel === "In Regs").length;
  const watchZone = profiles.filter((p) => p.riskLevel === "Watch Zone").length;
  const outOfRegs = profiles.filter((p) => p.riskLevel === "Out of Regs").length;
  const passed    = profiles.filter((p) => p.passFailStatus === "PASS").length;
  const passRate  = total > 0 ? Math.round((passed / total) * 100) : 0;

  // At Risk: passing but within 1% of BF limit
  const atRisk = profiles.filter(
    (p) => p.passFailStatus === "PASS" && p.effectiveMaxBodyFat - p.estimatedBodyFat <= 1
  ).length;

  // Watch Zone: closest marine to BF limit
  const watchZoneProfiles = profiles.filter((p) => p.riskLevel === "Watch Zone");
  const closestGap = watchZoneProfiles.length > 0
    ? Math.min(...watchZoneProfiles.map((p) => p.effectiveMaxBodyFat - p.estimatedBodyFat))
    : null;
  const watchZoneSub = closestGap !== null
    ? `Closest: ${Math.abs(closestGap).toFixed(1)}% from limit`
    : undefined;

  const passColor: "primary" | "yellow" | "red" =
    passRate >= 80 ? "primary" : passRate >= 60 ? "yellow" : "red";

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // ── Roster filtering ─────────────────────────────────────────────────────────
  const q = search.trim().toLowerCase();
  const filtered = profiles
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.riskLevel.toLowerCase().includes(q) ||
        formatDate(p.updatedAt).toLowerCase().includes(q)
      );
    });

  const handleDelete = async (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    setSelected(null);
    try {
      await apiDeleteProfile(id);
    } catch {
      await refresh();
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-20">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Command Dashboard</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Aggregate readiness across saved profiles</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading && profiles.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : total === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* ── Commander Summary ─────────────────────────────────────────── */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Commander Summary
            </p>

            {/* Row 1: Total | Pass Rate */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <StatCard
                icon={<Users className="w-3.5 h-3.5" />}
                label="Total Marines"
                value={total}
                color="muted"
              />
              <StatCard
                icon={<ShieldCheck className="w-3.5 h-3.5" />}
                label="Unit Pass Rate"
                value={`${passRate}%`}
                sub={`${passed} of ${total} passing`}
                color={passColor}
              />
            </div>

            {/* Row 2: In Regs | Watch Zone | Out of Regs */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              <StatCard
                icon={<ShieldCheck className="w-3 h-3" />}
                label="In Regs"
                value={inRegs}
                sub="> 2% below limit"
                color={inRegs === total ? "primary" : inRegs > 0 ? "primary" : "muted"}
              />
              <StatCard
                icon={<Zap className="w-3 h-3" />}
                label="Watch Zone"
                value={watchZone}
                sub={watchZoneSub ?? "Within 2% BF"}
                color={watchZone > 0 ? "yellow" : "muted"}
                tooltip="Marine is within 2.0% body fat of maximum allowable standard."
              />
              <StatCard
                icon={<Activity className="w-3 h-3" />}
                label="Out of Regs"
                value={outOfRegs}
                sub={outOfRegs > 0 ? "Requires action" : "All clear"}
                color={outOfRegs > 0 ? "red" : "muted"}
              />
            </div>

            {/* Row 3: At Risk */}
            <div className="grid grid-cols-1 gap-2">
              <StatCard
                icon={<AlertTriangle className="w-3.5 h-3.5" />}
                label="At Risk Marines"
                value={atRisk}
                sub="Passing but within 1% of BF limit — immediate attention required"
                color={atRisk > 0 ? "red" : "muted"}
                tooltip="Marines who are currently passing but have less than 1% body fat remaining before exceeding their maximum allowable standard."
              />
            </div>
          </div>

          {/* ── Pass Rate Bar ─────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>Unit Pass Rate</span>
              <span>{passRate}%</span>
            </div>
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  passRate >= 80 ? "bg-primary" : passRate >= 60 ? "bg-yellow-500" : "bg-destructive"
                }`}
                style={{ width: `${passRate}%` }}
              />
            </div>
            {/* Readiness breakdown bar */}
            <div className="flex gap-0 h-1.5 w-full rounded-full overflow-hidden">
              {inRegs > 0 && (
                <div className="bg-primary h-full transition-all" style={{ width: `${(inRegs / total) * 100}%` }} />
              )}
              {watchZone > 0 && (
                <div className="bg-yellow-500 h-full transition-all" style={{ width: `${(watchZone / total) * 100}%` }} />
              )}
              {outOfRegs > 0 && (
                <div className="bg-destructive h-full transition-all" style={{ width: `${(outOfRegs / total) * 100}%` }} />
              )}
            </div>
            <div className="flex gap-4 text-[9px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" />In Regs</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />Watch Zone</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive inline-block" />Out of Regs</span>
            </div>
          </div>

          {/* ── Marine Roster ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              Marine Roster
            </p>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name, status, or date…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 bg-card font-mono text-xs h-9"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No Marines match "{search}"</p>
            ) : (
              <div className="border border-border rounded-md overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto] text-[9px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-2 bg-muted/30">
                  <span>Name / Status</span>
                  <span className="text-right pr-3">BF%</span>
                  <span className="text-right">Trend</span>
                </div>
                <div className="flex flex-col divide-y divide-border">
                  {filtered.map((p) => {
                    const trend = computeTrend(p);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelected(p)}
                        className="grid grid-cols-[1fr_auto_auto] items-center px-3 py-3 gap-2 text-left w-full hover:bg-muted/30 active:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-mono font-bold text-foreground truncate">{p.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <RiskBadge risk={p.riskLevel} />
                            <p className="text-[9px] text-muted-foreground">
                              {formatDate(p.updatedAt)}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs font-mono font-bold text-foreground pr-3">
                          {p.estimatedBodyFat}%
                        </p>
                        <TrendPill trend={trend} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <MarineDetailDrawer
        profile={selected}
        onClose={() => setSelected(null)}
        onDelete={handleDelete}
        onEdit={(profile) => { onEdit(profile); }}
      />
    </div>
  );
}
