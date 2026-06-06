/**
 * CommandDashboard — Aggregate readiness view across all saved profiles.
 */
import { useState, useEffect } from "react";
import { Users, ShieldCheck, Zap, Scale, Activity, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarineProfile, loadProfiles, deleteProfile } from "@/lib/storage";

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
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
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

export function CommandDashboard() {
  const [profiles, setProfiles] = useState<MarineProfile[]>([]);

  const refresh = () => setProfiles(loadProfiles());

  useEffect(() => { refresh(); }, []);

  const total       = profiles.length;
  const passed      = profiles.filter((p) => p.passFailStatus === "PASS").length;
  const watchZone   = profiles.filter((p) => p.riskLevel === "Watch Zone").length;
  const hwFlagged   = profiles.filter((p) => p.overWeightLimit).length;
  const bfFailed    = profiles.filter((p) => p.passFailStatus === "FAIL").length;
  const passRate    = total > 0 ? Math.round((passed / total) * 100) : 0;

  const passColor: "primary" | "yellow" | "red" =
    passRate >= 80 ? "primary" : passRate >= 60 ? "yellow" : "red";

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const handleDelete = (id: string) => {
    deleteProfile(id);
    refresh();
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
              sub={total > 0 ? `${Math.round((watchZone / total) * 100)}% of unit` : undefined}
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
              label="H/W Flagged"
              value={hwFlagged}
              sub="Over H/W table — tape required"
              color={hwFlagged > 0 ? "yellow" : "muted"}
            />
            <StatCard
              icon={<ShieldCheck className="w-3.5 h-3.5" />}
              label="In Regs (Passing)"
              value={passed}
              sub={watchZone > 0 ? `Incl. ${watchZone} in Watch Zone` : "All clear of BF limits"}
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
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Marine Roster
            </p>
            <div className="border border-border rounded-md overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] text-[9px] font-bold uppercase tracking-widest text-muted-foreground px-4 py-2 bg-muted/30">
                <span>Name / Date</span>
                <span className="text-right pr-3">BF%</span>
                <span />
              </div>
              <div className="flex flex-col divide-y divide-border">
                {profiles
                  .slice()
                  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                  .map((p) => (
                    <div
                      key={p.id}
                      className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-2.5 gap-2"
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
                      <p className="text-xs font-mono text-foreground pr-2">
                        {p.estimatedBodyFat}%
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label={`Delete ${p.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
