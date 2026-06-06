/**
 * CommandDashboard — Aggregate readiness view across all saved profiles.
 */
import { useState, useEffect } from "react";
import { Users, ShieldCheck, Zap, Scale, Activity, RefreshCw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MarineProfile, loadProfiles, deleteProfile, computeTrend } from "@/lib/storage";
import { MarineDetailDrawer } from "./MarineDetailDrawer";

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: "primary" | "yellow" | "red" | "muted";
}) {
  const colors = {
    primary: { text: "text-primary",     border: "border-primary/30",     bg: "bg-primary/5"     },
    yellow:  { text: "text-yellow-600",  border: "border-yellow-500/30",  bg: "bg-yellow-500/5"  },
    red:     { text: "text-destructive", border: "border-destructive/30", bg: "bg-destructive/5" },
    muted:   { text: "text-foreground",  border: "border-border",         bg: "bg-card"          },
  }[color];

  return (
    <div className={`border rounded-md px-4 py-3 flex flex-col gap-1 ${colors.border} ${colors.bg}`}>
      <div className="flex items-center gap-2">
        <span className={colors.text}>{icon}</span>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
      <p className={`text-2xl font-mono font-bold ${colors.text}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground leading-relaxed">{sub}</p>}
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
  if (!trend) return null;
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
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MarineProfile | null>(null);

  const refresh = () => setProfiles(loadProfiles());

  useEffect(() => { refresh(); }, []);

  // ── Aggregate metrics ────────────────────────────────────────────────────────
  const total       = profiles.length;
  const passed      = profiles.filter((p) => p.passFailStatus === "PASS").length;
  const watchZone   = profiles.filter((p) => p.riskLevel === "Watch Zone").length;
  const tapeReq     = profiles.filter((p) => p.tapeRequired).length;
  const bfFailed    = profiles.filter((p) => p.passFailStatus === "FAIL").length;
  const passRate    = total > 0 ? Math.round((passed / total) * 100) : 0;

  // Watch Zone: find closest marine to BF limit
  const watchZoneProfiles = profiles.filter((p) => p.riskLevel === "Watch Zone");
  const closestGap = watchZoneProfiles.length > 0
    ? Math.min(...watchZoneProfiles.map((p) => p.effectiveMaxBodyFat - p.estimatedBodyFat))
    : null;
  const watchZoneSub = closestGap !== null
    ? `Closest: ${Math.abs(closestGap).toFixed(1)}% from limit`
    : "No Marines near limit";

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
        formatDate(p.updatedAt).toLowerCase().includes(q)
      );
    });

  const handleDelete = (id: string) => {
    deleteProfile(id);
    setSelected(null);
    refresh();
  };

  const handleEdit = (profile: MarineProfile) => {
    onEdit(profile);
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
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

      {total === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Metric grid */}
          <div className="grid grid-cols-2 gap-3">
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
              sub={`${passed} of ${total} passing`}
              color={passColor}
            />
            <StatCard
              icon={<Zap className="w-3.5 h-3.5" />}
              label="Watch Zone"
              value={watchZone}
              sub={watchZoneSub}
              color={watchZone > 0 ? "yellow" : "muted"}
            />
            <StatCard
              icon={<Activity className="w-3.5 h-3.5" />}
              label="BF Failures"
              value={bfFailed}
              sub={total > 0 ? `${Math.round((bfFailed / total) * 100)}% of unit` : undefined}
              color={bfFailed > 0 ? "red" : "muted"}
            />
            <StatCard
              icon={<Scale className="w-3.5 h-3.5" />}
              label="Tape Required"
              value={tapeReq}
              sub="Over H/W table — tape required"
              color={tapeReq > 0 ? "yellow" : "muted"}
            />
            <StatCard
              icon={<ShieldCheck className="w-3.5 h-3.5" />}
              label="In Regs (Passing)"
              value={passed}
              sub="Incl. Watch Zone Marines"
              color={passed === total ? "primary" : "muted"}
            />
          </div>

          {/* Pass rate bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>Unit Pass Rate</span>
              <span>{passRate}%</span>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  passRate >= 80 ? "bg-primary" : passRate >= 60 ? "bg-yellow-500" : "bg-destructive"
                }`}
                style={{ width: `${passRate}%` }}
              />
            </div>
          </div>

          {/* Marine roster */}
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Marine Roster
            </p>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search Marine…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 bg-card font-mono text-sm h-9"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No Marines match "{search}"</p>
            ) : (
              <div className="border border-border rounded-md overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto] text-[9px] font-bold uppercase tracking-widest text-muted-foreground px-4 py-2 bg-muted/30">
                  <span>Name / Date</span>
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
                        className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 gap-2 text-left w-full hover:bg-muted/30 active:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-mono font-bold text-foreground truncate">{p.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <p className="text-[10px] text-muted-foreground">
                              {formatDate(p.updatedAt)} · {p.weightLbs} lbs
                            </p>
                            <RiskBadge risk={p.riskLevel} />
                          </div>
                        </div>
                        <p className="text-xs font-mono text-foreground pr-3">
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

      {/* Marine detail drawer */}
      <MarineDetailDrawer
        profile={selected}
        onClose={() => setSelected(null)}
        onDelete={handleDelete}
        onEdit={handleEdit}
      />
    </div>
  );
}
