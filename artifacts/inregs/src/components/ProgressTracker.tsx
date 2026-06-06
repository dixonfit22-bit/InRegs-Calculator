/**
 * ProgressTracker — Weight goal timeline + history log.
 * Requires an active saved profile (profileId prop).
 */
import { useState, useEffect, useCallback } from "react";
import { TrendingDown, Plus, Trash2, ChevronDown, ChevronUp, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MarineProfile,
  WeightEntry,
  getProfile,
  updateProfileGoal,
  addWeightEntry,
  removeWeightEntry,
} from "@/lib/storage";

interface ProgressTrackerProps {
  profileId: string;
  currentWeight: number;
  maxAllowableWeight: number;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-muted/40 rounded px-3 py-2 flex flex-col gap-0.5">
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-base font-mono font-bold text-foreground leading-none">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + Math.round(weeks * 7));
  return d;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const PACE_OPTIONS = [
  { label: "0.5 lbs/wk", value: 0.5 },
  { label: "1.0 lbs/wk", value: 1.0 },
  { label: "1.5 lbs/wk", value: 1.5 },
  { label: "2.0 lbs/wk", value: 2.0 },
];

// ── Main ──────────────────────────────────────────────────────────────────────

export function ProgressTracker({ profileId, currentWeight, maxAllowableWeight }: ProgressTrackerProps) {
  const [profile, setProfile] = useState<MarineProfile | null>(null);
  const [goalInput, setGoalInput] = useState("");
  const [pace, setPace] = useState(1.0);
  const [logWeight, setLogWeight] = useState("");
  const [logDate, setLogDate] = useState(today());
  const [logNote, setLogNote] = useState("");
  const [logOpen, setLogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [goalSaved, setGoalSaved] = useState(false);

  const reload = useCallback(() => {
    const p = getProfile(profileId);
    if (p) {
      setProfile(p);
      if (p.goalWeight) setGoalInput(String(p.goalWeight));
      if (p.weeklyGoalLbs) setPace(p.weeklyGoalLbs);
    }
  }, [profileId]);

  useEffect(() => { reload(); }, [reload]);

  if (!profile) return null;

  // ── Derived values ──────────────────────────────────────────────────────────
  const goalWeight   = profile.goalWeight ?? maxAllowableWeight;
  const weeklyPace   = profile.weeklyGoalLbs ?? 1.0;
  const log          = [...profile.weightLog].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const startWeight  = log.length > 0
    ? Math.max(...profile.weightLog.map((e) => e.weight))
    : currentWeight;
  const latestWeight = log.length > 0 ? log[0].weight : currentWeight;
  const lbsLost      = Math.max(0, startWeight - latestWeight);
  const lbsRemaining = Math.max(0, latestWeight - goalWeight);
  const weeksRemaining = weeklyPace > 0 ? lbsRemaining / weeklyPace : null;
  const completionDate = weeksRemaining != null
    ? addWeeks(new Date(), weeksRemaining)
    : null;
  const totalToLose = Math.max(1, startWeight - goalWeight);
  const progressPct = Math.round((lbsLost / totalToLose) * 100);

  const barColor =
    progressPct >= 75 ? "bg-primary" : progressPct >= 40 ? "bg-yellow-500" : "bg-destructive";

  // ── Handlers ────────────────────────────────────────────────────────────────
  const saveGoal = () => {
    const g = parseFloat(goalInput);
    if (isNaN(g) || g <= 0) return;
    updateProfileGoal(profileId, g, pace);
    reload();
    setGoalSaved(true);
    setTimeout(() => setGoalSaved(false), 2000);
  };

  const handleLogWeight = () => {
    const w = parseFloat(logWeight);
    if (isNaN(w) || w <= 0) return;
    addWeightEntry(profileId, { date: logDate, weight: w, note: logNote || undefined });
    setLogWeight("");
    setLogNote("");
    reload();
  };

  const handleDeleteEntry = (entryId: string) => {
    removeWeightEntry(profileId, entryId);
    reload();
  };

  return (
    <div>
      {/* Section divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest">
          <span className="bg-background px-2 text-muted-foreground flex items-center gap-1.5">
            <TrendingDown className="w-3 h-3" />
            Progress Tracker
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-5">

        {/* Goal setup */}
        <div className="border border-border rounded-md px-4 py-4 space-y-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Goal Settings</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Goal Weight (lbs)
              </label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder={String(maxAllowableWeight)}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="bg-card font-mono h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Weekly Pace
              </label>
              <select
                value={pace}
                onChange={(e) => setPace(Number(e.target.value))}
                className="w-full h-9 bg-card border border-input rounded-md px-3 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {PACE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            variant={goalSaved ? "default" : "outline"}
            className={`w-full h-9 uppercase tracking-wider text-xs font-bold ${goalSaved ? "bg-primary text-primary-foreground" : ""}`}
            onClick={saveGoal}
          >
            {goalSaved ? "✓ Goal Saved" : "Set Goal"}
          </Button>
        </div>

        {/* Progress summary (only if goal is set) */}
        {profile.goalWeight && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span>{startWeight} lbs (start)</span>
                <span>{progressPct}% complete</span>
                <span>{goalWeight} lbs (goal)</span>
              </div>
              <Bar pct={progressPct} color={barColor} />
              <p className="text-[10px] text-muted-foreground text-center">
                Latest: {latestWeight} lbs · {lbsLost.toFixed(1)} lbs lost · {lbsRemaining.toFixed(1)} lbs to go
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCell label="Current" value={`${latestWeight} lbs`} />
              <StatCell label="Goal" value={`${goalWeight} lbs`} />
              <StatCell label="Remaining" value={`${lbsRemaining.toFixed(1)} lbs`} />
              <StatCell
                label="Est. Done"
                value={
                  completionDate
                    ? completionDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "—"
                }
                sub={
                  weeksRemaining != null
                    ? `~${Math.ceil(weeksRemaining)} weeks at ${weeklyPace} lbs/wk`
                    : undefined
                }
              />
            </div>
          </>
        )}

        {/* Log weight */}
        <div className="border border-border rounded-md overflow-hidden">
          <button
            type="button"
            onClick={() => setLogOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Log Weight Entry
              </span>
            </div>
            {logOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {logOpen && (
            <div className="px-4 pb-4 pt-3 space-y-3 border-t border-border">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Weight (lbs)
                  </label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="e.g. 175"
                    value={logWeight}
                    onChange={(e) => setLogWeight(e.target.value)}
                    className="bg-card font-mono h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="bg-card font-mono h-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Note (optional)
                </label>
                <Input
                  placeholder="e.g. Post-weigh-in"
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  className="bg-card font-mono h-9"
                />
              </div>
              <Button
                type="button"
                size="sm"
                className="w-full h-9 uppercase tracking-wider text-xs font-bold"
                onClick={handleLogWeight}
                disabled={!logWeight}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Log Entry
              </Button>
            </div>
          )}
        </div>

        {/* History log */}
        {log.length > 0 && (
          <div className="border border-border rounded-md overflow-hidden">
            <button
              type="button"
              onClick={() => setHistoryOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  History ({log.length} entries)
                </span>
              </div>
              {historyOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {historyOpen && (
              <div className="border-t border-border">
                <div className="grid grid-cols-[1fr_auto_auto_auto] text-[9px] font-bold uppercase tracking-widest text-muted-foreground px-4 py-2 bg-muted/30">
                  <span>Date</span>
                  <span className="text-right pr-4">Weight</span>
                  <span className="text-right pr-4">Change</span>
                  <span />
                </div>
                <div className="flex flex-col divide-y divide-border">
                  {log.map((entry, i) => {
                    const prev = log[i + 1];
                    const delta = prev ? entry.weight - prev.weight : null;
                    return (
                      <div
                        key={entry.id}
                        className="grid grid-cols-[1fr_auto_auto_auto] items-center px-4 py-2.5 gap-1"
                      >
                        <div>
                          <p className="text-xs font-mono text-foreground">{formatDate(entry.date)}</p>
                          {entry.note && (
                            <p className="text-[10px] text-muted-foreground">{entry.note}</p>
                          )}
                        </div>
                        <p className="text-xs font-mono font-bold text-foreground pr-4">
                          {entry.weight} lbs
                        </p>
                        <p
                          className={`text-xs font-mono pr-4 ${
                            delta == null
                              ? "text-muted-foreground"
                              : delta < 0
                              ? "text-primary"
                              : delta > 0
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }`}
                        >
                          {delta == null
                            ? "—"
                            : delta < 0
                            ? `−${Math.abs(delta).toFixed(1)}`
                            : delta > 0
                            ? `+${delta.toFixed(1)}`
                            : "—"}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
