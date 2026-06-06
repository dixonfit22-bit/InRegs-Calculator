/**
 * CommandDashboard — Unit readiness snapshot.
 */
import { useState, useEffect } from "react";
import {
  Users, ShieldCheck, Zap, Activity, RefreshCw,
  Search, Loader2, AlertTriangle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { MarineProfile, computeTrend } from "@/lib/storage";
import { apiGetProfiles, apiDeleteProfile } from "@/lib/api";
import { MarineDetailDrawer } from "./MarineDetailDrawer";

// ── Tooltip ────────────────────────────────────────────────────────────────────

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="relative group inline-flex items-center">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-md bg-popover border border-border text-[10px] font-normal normal-case tracking-normal leading-relaxed text-popover-foreground shadow-md px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 text-center whitespace-normal">
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

  const labelEl = (
    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">
      {label}
    </p>
  );

  return (
    <div className={`border rounded-md px-3 py-3 flex flex-col gap-1 ${colors.border} ${colors.bg}`}>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`shrink-0 ${colors.text}`}>{icon}</span>
        {tooltip ? (
          <Tooltip text={tooltip}>{labelEl}</Tooltip>
        ) : (
          labelEl
        )}
      </div>
      <p className={`text-2xl font-mono font-bold leading-none ${colors.text}`}>{value}</p>
      {sub && <p className="text-[9px] font-mono text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Risk Badge ────────────────────────────────────────────────────────────────

function RiskBadge({ risk }: { risk: "In Regs" | "Watch Zone" | "Out of Regs" }) {
  const cfg =
    risk === "In Regs"
      ? "bg-primary/10 text-primary"
      : risk === "Watch Zone"
      ? "bg-yellow-500/10 text-yellow-600"
      : "bg-destructive/10 text-destructive";
  return (
    <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${cfg}`}>
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

// ── Needs Attention Card ──────────────────────────────────────────────────────

function AttentionCard({
  profile,
  onClick,
}: {
  profile: MarineProfile;
  onClick: () => void;
}) {
  const gap     = profile.effectiveMaxBodyFat - profile.estimatedBodyFat;
  const isOver  = gap < 0;
  const gapText = isOver
    ? `${Math.abs(gap).toFixed(1)}% over limit`
    : `${gap.toFixed(1)}% from limit`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left border border-border rounded-md px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/30 active:bg-muted/50 transition-colors min-h-[64px]"
    >
      <div className="min-w-0 flex flex-col gap-0.5">
        <p className="text-sm font-mono font-bold text-foreground truncate">{profile.name}</p>
        <p className="text-[10px] font-mono text-muted-foreground">{gapText}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <p className={`text-base font-mono font-bold ${isOver ? "text-destructive" : "text-yellow-600"}`}>
          {profile.estimatedBodyFat}%
        </p>
        <RiskBadge risk={profile.riskLevel} />
      </div>
    </button>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <Users className="w-10 h-10 text-muted-foreground/30" />
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">No Profiles Yet</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Save an assessment on the Calculator tab to populate the dashboard.
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
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
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

  // ── Metrics ──────────────────────────────────────────────────────────────────
  const total     = profiles.length;
  // Passing = ALL marines who pass (includes Watch Zone — they are still compliant)
  const passing   = profiles.filter((p) => p.passFailStatus === "PASS").length;
  const watchZone = profiles.filter((p) => p.riskLevel === "Watch Zone").length;
  const outOfRegs = profiles.filter((p) => p.riskLevel === "Out of Regs").length;
  const passRate  = total > 0 ? Math.round((passing / total) * 100) : 0;

  // At Risk: passing but ≤1% BF from limit
  const atRisk = profiles.filter(
    (p) => p.passFailStatus === "PASS" &&
           p.effectiveMaxBodyFat - p.estimatedBodyFat <= 1
  ).length;

  // Watch Zone: closest gap
  const watchZoneProfiles = profiles.filter((p) => p.riskLevel === "Watch Zone");
  const closestGap = watchZoneProfiles.length > 0
    ? Math.min(...watchZoneProfiles.map((p) => p.effectiveMaxBodyFat - p.estimatedBodyFat))
    : null;

  const passColor: "primary" | "yellow" | "red" =
    passRate >= 80 ? "primary" : passRate >= 60 ? "yellow" : "red";

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // Marines needing attention: Watch Zone + Out of Regs
  const needsAttention = profiles.filter(
    (p) => p.riskLevel === "Watch Zone" || p.riskLevel === "Out of Regs"
  ).sort((a, b) => {
    // Out of Regs first, then Watch Zone sorted by tightest gap
    if (a.riskLevel !== b.riskLevel) {
      return a.riskLevel === "Out of Regs" ? -1 : 1;
    }
    return (a.effectiveMaxBodyFat - a.estimatedBodyFat) -
           (b.effectiveMaxBodyFat - b.estimatedBodyFat);
  });

  // Roster filter
  const q = search.trim().toLowerCase();
  const filtered = profiles
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.riskLevel.toLowerCase().includes(q) ||
        fmtDate(p.updatedAt).toLowerCase().includes(q)
      );
    });

  // Handlers
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
    <div className="flex flex-col gap-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Command Dashboard</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Unit Readiness Snapshot</p>
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
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : total === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* ── Summary cards ─────────────────────────────────────────────── */}
          {/* Row 1: Total | Pass Rate */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              icon={<Users className="w-3.5 h-3.5" />}
              label="Total Marines"
              value={total}
              color="muted"
            />
            <StatCard
              icon={<ShieldCheck className="w-3.5 h-3.5" />}
              label="Pass Rate"
              value={`${passRate}%`}
              color={passColor}
            />
          </div>

          {/* Row 2: Passing | Watch Zone | Out of Regs */}
          <div className="grid grid-cols-3 gap-2">
            <StatCard
              icon={<ShieldCheck className="w-3 h-3" />}
              label="Passing"
              value={passing}
              sub={`of ${total}`}
              color={passing === total ? "primary" : passing > 0 ? "primary" : "muted"}
            />
            <StatCard
              icon={<Zap className="w-3 h-3" />}
              label="Watch Zone"
              value={watchZone}
              sub={closestGap !== null ? `Closest: ${closestGap.toFixed(1)}%` : undefined}
              color={watchZone > 0 ? "yellow" : "muted"}
              tooltip="Within 2% of maximum allowable body fat."
            />
            <StatCard
              icon={<Activity className="w-3 h-3" />}
              label="Out of Regs"
              value={outOfRegs}
              color={outOfRegs > 0 ? "red" : "muted"}
            />
          </div>

          {/* At Risk — only shown when any exist */}
          {atRisk > 0 && (
            <StatCard
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
              label="At Risk"
              value={atRisk}
              sub={`Within 1.0% of limit`}
              color="red"
              tooltip="Marines who are passing but have less than 1% body fat remaining before failing."
            />
          )}

          {/* Pass rate bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>Unit Pass Rate</span>
              <span>{passRate}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  passRate >= 80 ? "bg-primary" : passRate >= 60 ? "bg-yellow-500" : "bg-destructive"
                }`}
                style={{ width: `${passRate}%` }}
              />
            </div>
          </div>

          {/* ── Needs Attention ───────────────────────────────────────────── */}
          {needsAttention.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                Needs Attention
              </p>
              {needsAttention.map((p) => (
                <AttentionCard
                  key={p.id}
                  profile={p}
                  onClick={() => setSelected(p)}
                />
              ))}
            </div>
          )}

          {/* ── Marine Roster ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              Marine Roster
            </p>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name or status…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 bg-card font-mono text-xs h-10"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No Marines match "{search}"</p>
            ) : (
              <div className="border border-border rounded-md overflow-hidden">
                {/* Column header */}
                <div className="grid grid-cols-[1fr_auto_auto] text-[9px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-2 bg-muted/30">
                  <span>Marine</span>
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
                        className="grid grid-cols-[1fr_auto_auto] items-center px-3 py-3.5 gap-2 text-left w-full hover:bg-muted/30 active:bg-muted/50 transition-colors min-h-[64px]"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-mono font-bold text-foreground truncate">{p.name}</p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <RiskBadge risk={p.riskLevel} />
                            <p className="text-[9px] text-muted-foreground">{fmtDate(p.updatedAt)}</p>
                          </div>
                        </div>
                        <p className="text-sm font-mono font-bold text-foreground pr-3">
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
