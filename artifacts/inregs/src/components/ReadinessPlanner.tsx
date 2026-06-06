import { useState } from "react";
import { Target, CheckCircle2, Zap, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RegResult } from "@/lib/marineStandards";
import { WATCH_ZONE } from "@/lib/usmcStandards";

interface ReadinessPlannerProps {
  result: RegResult;
}

// ── Progress Bar ─────────────────────────────────────────────────────────────

function GoalProgressBar({
  label,
  pct,
  status,
  detail,
  sub,
}: {
  label: string;
  pct: number; // 0-100
  status: "good" | "watch" | "fail" | "neutral";
  detail: string;
  sub?: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const barColor =
    status === "good" ? "bg-primary" : status === "watch" ? "bg-yellow-500" : status === "fail" ? "bg-destructive" : "bg-muted-foreground";
  const textColor =
    status === "good" ? "text-primary" : status === "watch" ? "text-yellow-600" : status === "fail" ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className={`text-xs font-mono font-bold ${textColor}`}>{detail}</p>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Projected Status Badge ────────────────────────────────────────────────────

function ProjectedStatusCard({
  status,
  targetWeight,
  result,
}: {
  status: "In Regs" | "Watch Zone" | "Out of Regs";
  targetWeight: number;
  result: RegResult;
}) {
  const cfg = {
    "In Regs": {
      icon: <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />,
      border: "border-primary",
      bg: "bg-primary/10",
      color: "text-primary",
    },
    "Watch Zone": {
      icon: <Zap className="w-4 h-4 text-yellow-500 shrink-0" />,
      border: "border-yellow-500",
      bg: "bg-yellow-500/10",
      color: "text-yellow-600",
    },
    "Out of Regs": {
      icon: <XCircle className="w-4 h-4 text-destructive shrink-0" />,
      border: "border-destructive",
      bg: "bg-destructive/10",
      color: "text-destructive",
    },
  }[status];

  const overH  = targetWeight > result.maxAllowableWeight;
  const bfFail = result.estimatedBodyFat > result.effectiveMaxBodyFat;

  const lines: string[] = [];
  if (!overH) lines.push(`Weight ${targetWeight} lbs ≤ ${result.maxAllowableWeight} lb limit ✓`);
  else lines.push(`Weight ${targetWeight} lbs over ${result.maxAllowableWeight} lb limit — tape required`);
  lines.push(`BF ${result.estimatedBodyFat}% vs ${result.effectiveMaxBodyFat}% limit ${bfFail ? "✗ (measurements unchanged)" : "✓"}`);
  lines.push(`WHtR ${result.whtrRatio.toFixed(3)} ${result.whtrPass ? "✓" : "✗ — waist reduction needed"}`);

  return (
    <div className={`border-2 rounded-md px-4 py-3 ${cfg.border} ${cfg.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        {cfg.icon}
        <p className={`text-xs font-bold uppercase tracking-widest ${cfg.color}`}>
          Projected: {status}
        </p>
      </div>
      <ul className="space-y-0.5">
        {lines.map((l) => (
          <li key={l} className="text-xs font-mono text-foreground">{l}</li>
        ))}
      </ul>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ReadinessPlanner({ result }: ReadinessPlannerProps) {
  const [targetWeight, setTargetWeight] = useState("");

  const maxWeight = result.maxAllowableWeight;
  const curWeight = result.currentWeight;
  const watchZoneFloor = maxWeight - WATCH_ZONE.WEIGHT_LBS; // bottom of watch zone

  const targetNum = parseFloat(targetWeight);
  const isValid  = targetWeight.trim() !== "" && !isNaN(targetNum) && targetNum > 0 && targetNum < 700;

  // ── Weight goals ────────────────────────────────────────────────────────────
  const poundsOverMax     = Math.max(0, curWeight - maxWeight);
  const poundsToWatchExit = Math.max(0, curWeight - watchZoneFloor + 1);

  // Progress toward max weight (0% = at current weight, 100% = at maxWeight)
  const weightProgress = poundsOverMax === 0
    ? 100
    : Math.round(((curWeight - (isValid ? targetNum : curWeight)) / poundsOverMax) * 100);

  // Progress toward watch zone exit
  const watchProgress = poundsToWatchExit === 0
    ? 100
    : Math.round(((curWeight - (isValid ? targetNum : curWeight)) / poundsToWatchExit) * 100);

  // BF progress (how much buffer they have — measurement-based, unchanged)
  const bfGap      = result.effectiveMaxBodyFat - result.estimatedBodyFat; // positive = buffer
  const bfPct      = Math.round(Math.max(0, Math.min(100, (bfGap / WATCH_ZONE.BODY_FAT_PCT) * 100)));
  const bfStatus   = bfGap < 0 ? "fail" : bfGap < WATCH_ZONE.BODY_FAT_PCT ? "watch" : "good";

  // WHtR progress (how close to the 0.52 limit — measurement-based, unchanged)
  const whtrLimit  = 0.52;
  const whtrBuffer = whtrLimit - result.whtrRatio; // positive = under limit
  const whtrPct    = result.whtrPass
    ? Math.round(Math.min(100, Math.max(0, (whtrBuffer / 0.05) * 100))) // 0.05 window
    : 0;
  const whtrStatus: "good" | "watch" | "fail" = result.whtrPass ? (whtrBuffer < 0.01 ? "watch" : "good") : "fail";

  // ── Projected overall status ────────────────────────────────────────────────
  let projectedStatus: "In Regs" | "Watch Zone" | "Out of Regs" | null = null;
  if (isValid) {
    const overH   = targetNum > maxWeight;
    const bfFail  = result.estimatedBodyFat > result.effectiveMaxBodyFat;
    const tapeFail = (overH || !result.whtrPass) && bfFail;

    if (tapeFail) {
      projectedStatus = "Out of Regs";
    } else {
      const nearWeight = !overH && targetNum >= watchZoneFloor;
      const nearBF     = bfGap >= 0 && bfGap < WATCH_ZONE.BODY_FAT_PCT;
      projectedStatus  = nearWeight || nearBF ? "Watch Zone" : "In Regs";
    }
  }

  // ── Weight status for bar ────────────────────────────────────────────────────
  const wtBarStatus: "good" | "watch" | "fail" =
    poundsOverMax === 0
      ? (curWeight >= watchZoneFloor ? "watch" : "good")
      : "fail";

  return (
    <div>
      {/* Section divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest">
          <span className="bg-background px-2 text-muted-foreground flex items-center gap-1.5">
            <Target className="w-3 h-3" />
            Readiness Planner
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-5">

        {/* Target weight input */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Target Weight (lbs)
          </label>
          <Input
            type="number"
            inputMode="decimal"
            placeholder={`e.g. ${maxWeight}`}
            value={targetWeight}
            onChange={(e) => setTargetWeight(e.target.value)}
            className="bg-card font-mono"
            data-testid="planner-target-weight"
          />
        </div>

        {/* Quick-fill buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-[10px] uppercase tracking-wider h-8 font-bold"
            onClick={() => setTargetWeight(String(maxWeight))}
          >
            Meet Max Weight ({maxWeight} lbs)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-[10px] uppercase tracking-wider h-8 font-bold"
            onClick={() => setTargetWeight(String(Math.max(1, watchZoneFloor - 1)))}
          >
            Leave Watch Zone ({Math.max(1, watchZoneFloor - 1)} lbs)
          </Button>
          {targetWeight !== "" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-[10px] uppercase tracking-wider h-8 text-muted-foreground"
              onClick={() => setTargetWeight("")}
            >
              Reset
            </Button>
          )}
        </div>

        {/* Progress bars */}
        <div className="flex flex-col gap-4 border border-border rounded-md px-4 py-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground -mb-1">Goal Progress</p>

          <GoalProgressBar
            label="Meet Max Weight"
            pct={weightProgress}
            status={wtBarStatus}
            detail={
              poundsOverMax === 0
                ? `${curWeight} lbs ✓ under ${maxWeight} lb limit`
                : isValid && targetNum <= maxWeight
                ? `Target ${targetNum} lbs ✓ meets limit`
                : `${poundsOverMax} lbs to lose (${curWeight} → ${maxWeight})`
            }
            sub={isValid && poundsOverMax > 0 ? `Target: ${targetNum} lbs — ${Math.max(0, weightProgress)}% of goal` : undefined}
          />

          <GoalProgressBar
            label="Leave Watch Zone (weight)"
            pct={watchProgress}
            status={poundsToWatchExit === 0 ? "good" : isValid && targetNum < watchZoneFloor ? "good" : "watch"}
            detail={
              poundsToWatchExit === 0
                ? `Already clear of weight watch zone ✓`
                : isValid && targetNum < watchZoneFloor
                ? `Target ${targetNum} lbs clears watch zone ✓`
                : `${poundsToWatchExit} lbs to exit watch zone (need < ${watchZoneFloor} lbs)`
            }
            sub={isValid && poundsToWatchExit > 0 ? `Target: ${targetNum} lbs — ${Math.max(0, watchProgress)}% of goal` : undefined}
          />

          <GoalProgressBar
            label="Body Fat Buffer (current measurements)"
            pct={bfPct}
            status={bfStatus}
            detail={
              bfGap < 0
                ? `${Math.abs(bfGap).toFixed(1)}% over limit — reduce waist/neck`
                : `${bfGap.toFixed(1)}% buffer below ${result.effectiveMaxBodyFat}% limit`
            }
            sub="BF is based on circumference measurements — not affected by weight target alone"
          />

          <GoalProgressBar
            label="WHtR (current waist)"
            pct={whtrPct}
            status={whtrStatus}
            detail={
              result.whtrPass
                ? `${result.whtrRatio.toFixed(3)} ✓ under 0.52`
                : `${result.whtrRatio.toFixed(3)} ✗ over 0.52${result.whtrMaxWaist ? ` — reduce waist to ${result.whtrMaxWaist}"` : ""}`
            }
            sub="WHtR depends on waist measurement — waist reduction required to improve this"
          />
        </div>

        {/* Projected status */}
        {isValid && projectedStatus && (
          <ProjectedStatusCard
            status={projectedStatus}
            targetWeight={targetNum}
            result={result}
          />
        )}

        {/* Disclaimer */}
        <p className="text-[11px] text-muted-foreground border border-border/50 px-3 py-2 leading-relaxed">
          Planner results are estimates and are not official determinations. Verify all results against current Marine Corps orders and directives.
        </p>
      </div>
    </div>
  );
}
