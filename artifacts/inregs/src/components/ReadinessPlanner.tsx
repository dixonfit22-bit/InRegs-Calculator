import { useState } from "react";
import { Target, CheckCircle2, Zap, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RegResult } from "@/lib/marineStandards";
import { WATCH_ZONE, estimateBodyFatPct } from "@/lib/usmcStandards";
import { FormData } from "@/lib/validation";

// Empirical rule: ~1 inch of waist reduction per 10 lbs lost.
// Widely cited in body composition literature as a rough linear estimate.
const WAIST_INCHES_PER_LB_LOST = 1 / 10;

interface ReadinessPlannerProps {
  result: RegResult;
  inputs: FormData;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function pct(value: number, min: number, max: number): number {
  if (max === min) return value <= max ? 100 : 0;
  return clamp(Math.round(((value - min) / (max - min)) * 100), 0, 100);
}

// ── Progress Bar ─────────────────────────────────────────────────────────────

function GoalBar({
  label,
  fill,
  status,
  primary,
  sub,
}: {
  label: string;
  fill: number; // 0-100, left-to-right = worse-to-better
  status: "good" | "watch" | "fail";
  primary: string;
  sub?: string;
}) {
  const bar =
    status === "good"
      ? "bg-primary"
      : status === "watch"
      ? "bg-yellow-500"
      : "bg-destructive";
  const txt =
    status === "good"
      ? "text-primary"
      : status === "watch"
      ? "text-yellow-600"
      : "text-destructive";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">
          {label}
        </p>
        <p className={`text-[11px] font-mono font-bold ${txt} text-right`}>{primary}</p>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${bar}`}
          style={{ width: `${fill}%` }}
        />
      </div>
      {sub && (
        <p className="text-[10px] text-muted-foreground leading-relaxed">{sub}</p>
      )}
    </div>
  );
}

// ── Projected Measurements Card ───────────────────────────────────────────────

function ProjectedMeasurements({
  weightLoss,
  projWaist,
  projBF,
  projWHtR,
  curWaist,
  curBF,
  curWHtR,
}: {
  weightLoss: number;
  projWaist: number;
  projBF: number;
  projWHtR: number;
  curWaist: number;
  curBF: number;
  curWHtR: number;
}) {
  const waistDelta = (curWaist - projWaist).toFixed(1);
  const bfDelta    = (curBF   - projBF).toFixed(1);
  const whtrDelta  = (curWHtR - projWHtR).toFixed(3);

  return (
    <div className="border border-border rounded-md px-4 py-3 space-y-2">
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        Projected Measurements at {`-${weightLoss.toFixed(0)}`} lbs
      </p>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { title: "Waist",  cur: `${curWaist}"`,      proj: `${projWaist.toFixed(1)}"`,    delta: `-${waistDelta}"` },
          { title: "BF %",   cur: `${curBF}%`,          proj: `${projBF.toFixed(1)}%`,       delta: `-${bfDelta}%`   },
          { title: "WHtR",   cur: curWHtR.toFixed(3),  proj: projWHtR.toFixed(3),           delta: `-${whtrDelta}`  },
        ].map(({ title, cur, proj, delta }) => (
          <div key={title} className="bg-muted/40 rounded px-2 py-2 space-y-0.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
            <p className="text-xs font-mono text-muted-foreground line-through">{cur}</p>
            <p className="text-sm font-mono font-bold text-foreground">{proj}</p>
            <p className="text-[10px] font-mono text-primary">{delta}</p>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground leading-relaxed">
        Waist estimated at −1" per 10 lbs lost. BF% uses the DoD circumference formula on the projected waist. Neck and hip held constant.
      </p>
    </div>
  );
}

// ── Projected Status Card ─────────────────────────────────────────────────────

function ProjectedStatusCard({
  status,
  targetWeight,
  projBF,
  projWHtR,
  projWHtRPass,
  result,
}: {
  status: "In Regs" | "Watch Zone" | "Out of Regs";
  targetWeight: number;
  projBF: number;
  projWHtR: number;
  projWHtRPass: boolean;
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

  const overH   = targetWeight > result.maxAllowableWeight;
  const bfPass  = projBF <= result.effectiveMaxBodyFat;
  const bfGap   = result.effectiveMaxBodyFat - projBF;

  const lines = [
    overH
      ? `Weight ${targetWeight} lbs over ${result.maxAllowableWeight} lb limit — tape required`
      : `Weight ${targetWeight} lbs ≤ ${result.maxAllowableWeight} lb limit ✓`,
    bfPass
      ? `Proj. BF ${projBF.toFixed(1)}% — ${bfGap.toFixed(1)}% under ${result.effectiveMaxBodyFat}% limit ✓`
      : `Proj. BF ${projBF.toFixed(1)}% over ${result.effectiveMaxBodyFat}% limit ✗`,
    projWHtRPass
      ? `Proj. WHtR ${projWHtR.toFixed(3)} ≤ 0.52 ✓`
      : `Proj. WHtR ${projWHtR.toFixed(3)} over 0.52 ✗`,
  ];

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
          <li key={l} className="text-xs font-mono text-foreground leading-relaxed">
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ReadinessPlanner({ result, inputs }: ReadinessPlannerProps) {
  const [targetWeight, setTargetWeight] = useState("");

  // Parse static inputs
  const sex         = inputs.sex as "male" | "female";
  const heightIn    = Number(inputs.heightInches);
  const neckIn      = Number(inputs.neckInches);
  const hipIn       = inputs.hipInches ? Number(inputs.hipInches) : undefined;

  const maxWeight     = result.maxAllowableWeight;
  const curWeight     = result.currentWeight;
  const curWaist      = result.waistInches;
  const curBF         = result.estimatedBodyFat;
  const curWHtR       = result.whtrRatio;
  const watchZoneFloor = maxWeight - WATCH_ZONE.WEIGHT_LBS; // bottom of the watch zone

  const targetNum = parseFloat(targetWeight);
  const isValid   = targetWeight.trim() !== "" && !isNaN(targetNum) && targetNum > 0 && targetNum < 700;

  // ── Projections ────────────────────────────────────────────────────────────
  const weightLoss   = isValid ? Math.max(0, curWeight - targetNum) : 0;
  const projWaist    = isValid
    ? clamp(curWaist - weightLoss * WAIST_INCHES_PER_LB_LOST, neckIn + 0.5, curWaist)
    : curWaist;
  const projBF       = isValid
    ? estimateBodyFatPct(sex, heightIn, neckIn, projWaist, hipIn)
    : curBF;
  const projWHtR     = Math.round((projWaist / heightIn) * 1000) / 1000;
  const projWHtRMax  = result.whtrMaxWaist ?? heightIn * 0.52;
  const projWHtRPass = projWaist <= projWHtRMax;

  // ── Goal-distance values ────────────────────────────────────────────────────
  const poundsOverMax      = Math.max(0, curWeight - maxWeight);
  const poundsToWatchExit  = Math.max(0, curWeight - watchZoneFloor + 1);

  const bfGapCur  = result.effectiveMaxBodyFat - curBF;  // positive = buffer
  const bfGapProj = result.effectiveMaxBodyFat - projBF;
  const whtrGapCur  = 0.52 - curWHtR;
  const whtrGapProj = 0.52 - projWHtR;

  // ── Progress fills (0–100, higher = closer to goal) ───────────────────────

  // Weight: progress from curWeight toward maxWeight
  const wtFill = poundsOverMax === 0 ? 100 : pct(isValid ? curWeight - targetNum : 0, 0, poundsOverMax);

  // Watch zone: progress from curWeight toward watchZoneFloor
  const wzFill = poundsToWatchExit === 0 ? 100 : pct(isValid ? curWeight - targetNum : 0, 0, poundsToWatchExit);

  // BF: show projected position between 0% and the limit; fill = how far below limit
  // 100% = exactly at limit, higher % = more buffer
  const bfFillMax = result.effectiveMaxBodyFat;
  const bfFill    = pct(bfFillMax - (isValid ? projBF : curBF), 0, bfFillMax);

  // WHtR: progress from current ratio toward 0.52 limit
  const whtrFill = isValid
    ? pct(0.52 - projWHtR, 0, 0.1) // 0.10 range (plenty of headroom)
    : pct(0.52 - curWHtR, 0, 0.1);

  // ── Status of each bar ─────────────────────────────────────────────────────
  const wtStatus: "good" | "watch" | "fail" =
    poundsOverMax === 0
      ? (curWeight >= watchZoneFloor ? "watch" : "good")
      : "fail";

  const bfStatus: "good" | "watch" | "fail" =
    (isValid ? bfGapProj : bfGapCur) < 0
      ? "fail"
      : (isValid ? bfGapProj : bfGapCur) < WATCH_ZONE.BODY_FAT_PCT
      ? "watch"
      : "good";

  const whtrStatus: "good" | "watch" | "fail" =
    (isValid ? projWHtRPass : result.whtrPass)
      ? (isValid ? whtrGapProj : whtrGapCur) < 0.01 ? "watch" : "good"
      : "fail";

  // ── Projected overall status ────────────────────────────────────────────────
  let projectedStatus: "In Regs" | "Watch Zone" | "Out of Regs" | null = null;
  if (isValid) {
    const overH            = targetNum > maxWeight;
    const projTapeRequired = overH || !projWHtRPass;
    const projFail         = projTapeRequired && projBF > result.effectiveMaxBodyFat;

    if (projFail) {
      projectedStatus = "Out of Regs";
    } else {
      const nearWeight = !overH && targetNum >= watchZoneFloor;
      const nearBF     = bfGapProj >= 0 && bfGapProj < WATCH_ZONE.BODY_FAT_PCT;
      projectedStatus  = nearWeight || nearBF ? "Watch Zone" : "In Regs";
    }
  }

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
            Mission Planner
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

        {/* Projected measurements (only when a valid target is set) */}
        {isValid && weightLoss > 0 && (
          <ProjectedMeasurements
            weightLoss={weightLoss}
            projWaist={projWaist}
            projBF={projBF}
            projWHtR={projWHtR}
            curWaist={curWaist}
            curBF={curBF}
            curWHtR={curWHtR}
          />
        )}

        {/* Progress bars */}
        <div className="flex flex-col gap-4 border border-border rounded-md px-4 py-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground -mb-1">
            Goal Progress {isValid ? `(at target ${targetNum} lbs)` : "(set a target above)"}
          </p>

          <GoalBar
            label="Meet Max Weight"
            fill={wtFill}
            status={wtStatus}
            primary={
              poundsOverMax === 0
                ? `${curWeight} lbs ✓ under ${maxWeight} lb max`
                : isValid && targetNum <= maxWeight
                ? `Target ${targetNum} lbs ✓ meets limit`
                : `${poundsOverMax} lbs over (${curWeight} → ${maxWeight})`
            }
            sub={
              isValid && poundsOverMax > 0
                ? `Target ${targetNum} lbs — ${wtFill}% of goal (${Math.max(0, Math.ceil(targetNum - maxWeight))} lbs remaining)`
                : undefined
            }
          />

          <GoalBar
            label="Leave Watch Zone"
            fill={wzFill}
            status={poundsToWatchExit === 0 ? "good" : isValid && targetNum < watchZoneFloor ? "good" : "watch"}
            primary={
              poundsToWatchExit === 0
                ? `Clear of weight watch zone ✓`
                : isValid && targetNum < watchZoneFloor
                ? `Target ${targetNum} lbs clears watch zone ✓`
                : `Need < ${watchZoneFloor} lbs (${poundsToWatchExit} lbs to go)`
            }
            sub={
              isValid && poundsToWatchExit > 0
                ? `Target ${targetNum} lbs — ${wzFill}% of goal`
                : undefined
            }
          />

          <GoalBar
            label="Body Fat"
            fill={bfFill}
            status={bfStatus}
            primary={
              isValid
                ? `Proj. BF ${projBF.toFixed(1)}% vs ${result.effectiveMaxBodyFat}% limit (${bfGapProj >= 0 ? `${bfGapProj.toFixed(1)}% buffer` : `${Math.abs(bfGapProj).toFixed(1)}% over`})`
                : `Current BF ${curBF}% vs ${result.effectiveMaxBodyFat}% limit`
            }
            sub={
              isValid
                ? `Projected waist ${projWaist.toFixed(1)}" (−${weightLoss.toFixed(0)} lbs → −${(weightLoss * WAIST_INCHES_PER_LB_LOST).toFixed(1)}" est.)`
                : "Enter a target weight to see BF projection"
            }
          />

          <GoalBar
            label="WHtR (waist-to-height)"
            fill={whtrFill}
            status={whtrStatus}
            primary={
              isValid
                ? `Proj. ${projWHtR.toFixed(3)} vs 0.520 limit (${projWHtRPass ? `${whtrGapProj.toFixed(3)} under ✓` : `${Math.abs(whtrGapProj).toFixed(3)} over ✗`})`
                : `Current ${curWHtR.toFixed(3)} vs 0.520 limit`
            }
            sub={
              isValid
                ? `Based on projected waist ${projWaist.toFixed(1)}" / height ${heightIn}"`
                : "Enter a target weight to see WHtR projection"
            }
          />
        </div>

        {/* Projected overall status */}
        {isValid && projectedStatus && (
          <ProjectedStatusCard
            status={projectedStatus}
            targetWeight={targetNum}
            projBF={projBF}
            projWHtR={projWHtR}
            projWHtRPass={projWHtRPass}
            result={result}
          />
        )}

        {/* Disclaimer */}
        <p className="text-[11px] text-muted-foreground border border-border/50 px-3 py-2 leading-relaxed">
          Planner results are estimates and are not official determinations. Waist projection uses −1" per 10 lbs lost; BF% uses the DoD circumference formula on that estimated waist. Verify all results against current Marine Corps orders and directives.
        </p>
      </div>
    </div>
  );
}
