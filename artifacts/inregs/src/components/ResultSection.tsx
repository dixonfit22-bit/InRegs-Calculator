import { useState } from "react";
import {
  CheckCircle2, Zap, XCircle, ShieldCheck, TrendingUp,
  FileText, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RegResult } from "@/lib/marineStandards";
import { WATCH_ZONE } from "@/lib/usmcStandards";
import { FormData } from "@/lib/validation";
import { ReportModal } from "./ReportModal";
import { ReadinessPlanner } from "./ReadinessPlanner";
import { SaveProfileButton } from "./ProfileLoader";
import { ProgressTracker } from "./ProgressTracker";

// ── Helpers ──────────────────────────────────────────────────────────────────

type RowStatus = "pass" | "watch" | "fail";

function statusColor(s: RowStatus) {
  if (s === "pass")  return { dot: "bg-primary",      text: "text-primary",     badge: "bg-primary/10 text-primary border-primary/30" };
  if (s === "watch") return { dot: "bg-yellow-500",   text: "text-yellow-600",  badge: "bg-yellow-50 text-yellow-700 border-yellow-300" };
  return               { dot: "bg-destructive",   text: "text-destructive", badge: "bg-destructive/10 text-destructive border-destructive/30" };
}

function StatusBadge({ status }: { status: RowStatus }) {
  const c = statusColor(status);
  const label = status === "pass" ? "PASS" : status === "watch" ? "WATCH" : "FAIL";
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${c.badge}`}>
      {label}
    </span>
  );
}

// ── Large Status Banner ───────────────────────────────────────────────────────

function StatusHero({ riskLevel, passFailStatus }: { riskLevel: string; passFailStatus: string }) {
  const cfg = riskLevel === "In Regs"
    ? {
        bg: "bg-primary",
        icon: <CheckCircle2 className="w-10 h-10 text-primary-foreground/80 shrink-0" />,
        headline: "PASSING BCP STANDARDS",
        sub: "All current requirements met.",
      }
    : riskLevel === "Watch Zone"
    ? {
        bg: "bg-yellow-500",
        icon: <Zap className="w-10 h-10 text-white/80 shrink-0" />,
        headline: "AT RISK / WATCH",
        sub: "Within limits but close — take action now.",
      }
    : {
        bg: "bg-destructive",
        icon: <XCircle className="w-10 h-10 text-destructive-foreground/80 shrink-0" />,
        headline: "NOT MEETING STANDARDS",
        sub: "Action required to come into compliance.",
      };

  return (
    <div className={`${cfg.bg} px-5 py-6 flex items-center gap-4`} data-testid="status-banner">
      {cfg.icon}
      <div>
        <p className="text-white text-xl font-black tracking-wider leading-tight">{cfg.headline}</p>
        <p className="text-white/70 text-xs font-mono mt-1">{cfg.sub}</p>
      </div>
    </div>
  );
}

// ── Readiness Summary ─────────────────────────────────────────────────────────

interface SummaryRow {
  label: string;
  status: RowStatus | null; // null = score row (PFT/CFT)
  value: string;
  detail?: string;
}

function ReadinessSummary({ result, pftScore, cftScore }: {
  result: RegResult;
  pftScore: number;
  cftScore: number;
}) {
  const rows: SummaryRow[] = [];

  // Weight
  const weightGap = result.maxAllowableWeight - result.currentWeight;
  const weightStatus: RowStatus = result.overWeightLimit
    ? "fail"
    : weightGap <= WATCH_ZONE.WEIGHT_LBS
    ? "watch"
    : "pass";
  const weightValue = result.overWeightLimit
    ? `${Math.abs(weightGap)} lbs Over Limit`
    : weightGap === 0
    ? "At Limit"
    : `${weightGap} lbs Below Limit`;
  rows.push({
    label: "Weight",
    status: weightStatus,
    value: weightValue,
    detail: `${result.currentWeight} lbs / ${result.maxAllowableWeight} lb limit`,
  });

  // Waist (WHtR)
  if (result.whtrMaxWaist !== null) {
    const waistGap = Math.round((result.whtrMaxWaist - result.waistInches) * 10) / 10;
    const waistStatus: RowStatus = !result.whtrPass ? "fail" : waistGap <= 0.5 ? "watch" : "pass";
    const waistValue = !result.whtrPass
      ? `${Math.abs(waistGap)}" Over Limit`
      : waistGap === 0
      ? "At Limit"
      : `${waistGap}" Below Limit`;
    rows.push({
      label: "Waist",
      status: waistStatus,
      value: waistValue,
      detail: `${result.waistInches}" / ${result.whtrMaxWaist}" max`,
    });
  }

  // Body Fat
  const bfGap = Math.round((result.effectiveMaxBodyFat - result.estimatedBodyFat) * 10) / 10;
  const bfOver = result.estimatedBodyFat > result.effectiveMaxBodyFat;
  const bfStatus: RowStatus = bfOver ? "fail" : Math.abs(bfGap) <= WATCH_ZONE.BODY_FAT_PCT ? "watch" : "pass";
  const bfValue = bfOver
    ? `${Math.abs(bfGap)}% Over Limit`
    : bfGap === 0
    ? "At Limit"
    : `${bfGap}% Below Limit`;
  rows.push({
    label: "Body Fat",
    status: bfStatus,
    value: bfValue,
    detail: `${result.estimatedBodyFat}% est. / ${result.effectiveMaxBodyFat}% limit`,
  });

  // PFT / CFT — score rows
  const pftColor = pftScore >= 225 ? "text-primary" : pftScore >= 150 ? "text-yellow-600" : "text-destructive";
  const cftColor = cftScore >= 225 ? "text-primary" : cftScore >= 150 ? "text-yellow-600" : "text-destructive";

  rows.push({ label: "PFT", status: null, value: String(pftScore), detail: "/ 300" });
  rows.push({ label: "CFT", status: null, value: String(cftScore), detail: "/ 300" });

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <p className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/30 border-b border-border">
        Readiness Summary
      </p>
      <div className="divide-y divide-border">
        {rows.map((row) => {
          const c = row.status ? statusColor(row.status) : null;
          const isScore = row.status === null;
          return (
            <div key={row.label} className="flex items-center px-4 py-3 gap-3">
              {/* Dot */}
              {c ? (
                <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
              ) : (
                <span className="w-2 h-2 rounded-full shrink-0 bg-border" />
              )}

              {/* Label */}
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground w-20 shrink-0">
                {row.label}
              </p>

              {/* Value */}
              {isScore ? (
                <p className={`text-sm font-mono font-bold flex-1 ${
                  row.label === "PFT" ? pftColor : cftColor
                }`}>
                  {row.value}
                  <span className="text-muted-foreground font-normal text-xs ml-1">{row.detail}</span>
                </p>
              ) : (
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-mono font-bold ${c?.text}`}>{row.value}</p>
                  {row.detail && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{row.detail}</p>
                  )}
                </div>
              )}

              {/* Badge */}
              {row.status && <StatusBadge status={row.status} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── What Do I Need? (plain language) ─────────────────────────────────────────

function WhatDoINeed({ result }: { result: RegResult }) {
  const items: { icon: string; text: string; status: RowStatus }[] = [];

  // Weight
  const weightGap = result.maxAllowableWeight - result.currentWeight;
  if (result.overWeightLimit) {
    items.push({ icon: "⚠", status: "fail",  text: `Lose ${Math.abs(weightGap)} lbs to meet the height/weight standard.` });
  } else if (weightGap <= WATCH_ZONE.WEIGHT_LBS) {
    items.push({ icon: "⚡", status: "watch", text: `You have ${weightGap} lb${weightGap !== 1 ? "s" : ""} before reaching your weight limit — stay vigilant.` });
  } else {
    items.push({ icon: "✓", status: "pass",  text: `Maintain current weight. You are ${weightGap} lbs below your limit.` });
  }

  // Waist
  if (result.whtrMaxWaist !== null) {
    const waistGap = Math.round((result.whtrMaxWaist - result.waistInches) * 10) / 10;
    if (!result.whtrPass) {
      items.push({ icon: "⚠", status: "fail",  text: `Reduce waist by ${Math.abs(waistGap)}" to pass the waist-to-height screening.` });
    } else if (waistGap <= 0.5) {
      items.push({ icon: "⚡", status: "watch", text: `Keep waist below ${result.whtrMaxWaist}". You are ${waistGap}" away from the limit.` });
    } else {
      items.push({ icon: "✓", status: "pass",  text: `Waist is ${waistGap}" below the limit. Keep it up.` });
    }
  }

  // Body Fat
  const bfGap = Math.round((result.effectiveMaxBodyFat - result.estimatedBodyFat) * 10) / 10;
  const bfOver = result.estimatedBodyFat > result.effectiveMaxBodyFat;
  if (bfOver) {
    items.push({ icon: "⚠", status: "fail",  text: `Estimated body fat is ${Math.abs(bfGap)}% over the limit. Reduce through diet and exercise.` });
  } else if (bfGap <= WATCH_ZONE.BODY_FAT_PCT) {
    items.push({ icon: "⚡", status: "watch", text: `You have ${bfGap}% body fat before reaching your limit — stay in watch zone.` });
  } else {
    items.push({ icon: "✓", status: "pass",  text: `Body fat is ${bfGap}% below your limit. Maintain current habits.` });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">
        What Do I Need?
      </p>
      {items.map((item, i) => {
        const c = statusColor(item.status);
        return (
          <div
            key={i}
            className={`flex items-start gap-3 px-4 py-3 rounded-md border ${
              item.status === "pass"
                ? "border-primary/30 bg-primary/5"
                : item.status === "watch"
                ? "border-yellow-400/40 bg-yellow-50/30 dark:bg-yellow-900/10"
                : "border-destructive/30 bg-destructive/5"
            }`}
          >
            <span className={`text-sm shrink-0 mt-0.5 ${c.text}`}>{item.icon}</span>
            <p className="text-sm text-foreground leading-snug">{item.text}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Regulation Details (collapsible) ─────────────────────────────────────────

function RegulationDetails({ result }: { result: RegResult }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors"
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Show Regulation Details
        </p>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 py-4 flex flex-col gap-4 border-t border-border">

          {/* Narrative */}
          <p className="text-sm leading-relaxed text-muted-foreground">{result.message}</p>

          {/* WHtR detail */}
          {result.whtrMaxWaist !== null && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                Waist-to-Height Ratio (WHtR)
              </p>
              <div className="flex items-center gap-3">
                <p className={`text-2xl font-mono font-bold ${result.whtrPass ? "text-primary" : "text-destructive"}`}>
                  {result.whtrRatio.toFixed(3)}
                </p>
                <div>
                  <p className="text-xs text-muted-foreground">Standard: &lt; 0.52</p>
                  <p className="text-xs text-muted-foreground">Max waist {result.whtrMaxWaist}" at your height</p>
                </div>
              </div>
            </div>
          )}

          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="border border-border rounded-md px-3 py-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                Body Weight
              </p>
              <p className={`text-xl font-mono font-bold ${result.overWeightLimit ? "text-destructive" : "text-primary"}`}>
                {result.currentWeight} <span className="text-sm font-normal">lbs</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">limit {result.maxAllowableWeight} lbs</p>
            </div>
            <div className="border border-border rounded-md px-3 py-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                Est. Body Fat
              </p>
              <p className={`text-xl font-mono font-bold ${result.estimatedBodyFat > result.effectiveMaxBodyFat ? "text-destructive" : "text-primary"}`}>
                {result.estimatedBodyFat} <span className="text-sm font-normal">%</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">limit {result.effectiveMaxBodyFat}%</p>
            </div>
          </div>

          {/* Performance banners */}
          {result.performanceExempt && (
            <div className="border border-primary/40 bg-primary/5 p-3 flex items-start gap-2" data-testid="performance-exempt-banner">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-primary font-mono leading-snug">
                High-Performance BF Cap (MARADMIN 066/26): Both PFT &amp; CFT ≥ {result.bestFitnessScore} — BF limit raised from {result.maxBodyFat}% to {result.effectiveMaxBodyFat}%.
              </p>
            </div>
          )}
          {result.performanceAllowance && (
            <div className="border border-primary/40 bg-primary/5 p-3 flex items-start gap-2" data-testid="performance-allowance-banner">
              <TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-primary font-mono leading-snug">
                Performance Allowance (MARADMIN 066/26): Both PFT &amp; CFT ≥ {result.bestFitnessScore} — +1% BF applied, effective limit {result.effectiveMaxBodyFat}%.
              </p>
            </div>
          )}

          {/* BIA note */}
          <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
            Tape method is a screening estimate. Formal BCP assignment requires BIA verification via InBody 770 (IB770) within 7 working days per MCBul 6110. WHtR ≤ 0.52 is an additional screening criterion per MCBul 6110.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main ResultSection ────────────────────────────────────────────────────────

interface ResultSectionProps {
  result: RegResult;
  inputs: FormData;
  pftScore: number;
  cftScore: number;
  onReset: () => void;
  activeProfileId: string | null;
  onProfileSaved: (id: string, displayName?: string) => void;
  marineName?: string;
}

export function ResultSection({
  result, inputs, pftScore, cftScore,
  onReset, activeProfileId, onProfileSaved, marineName,
}: ResultSectionProps) {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* 1 — Large status hero */}
      <StatusHero riskLevel={result.riskLevel} passFailStatus={result.passFailStatus} />

      {/* 2 — Readiness summary grid */}
      <ReadinessSummary result={result} pftScore={pftScore} cftScore={cftScore} />

      {/* 3 — Plain-language guidance */}
      <WhatDoINeed result={result} />

      {/* 4 — Regulation details (collapsible) */}
      <RegulationDetails result={result} />

      {/* 5 — Readiness planner */}
      <ReadinessPlanner result={result} inputs={inputs} />

      {/* 6 — Progress Tracker (saved profiles only) */}
      {activeProfileId && (
        <ProgressTracker
          profileId={activeProfileId}
          currentWeight={result.currentWeight}
          maxAllowableWeight={result.maxAllowableWeight}
        />
      )}

      {/* 7 — Actions */}
      <SaveProfileButton
        result={result}
        inputs={inputs}
        activeProfileId={activeProfileId}
        onSaved={onProfileSaved}
      />

      <Button
        className="w-full h-12 uppercase tracking-widest text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
        onClick={() => setReportOpen(true)}
        data-testid="button-generate-report"
      >
        <FileText className="w-4 h-4" />
        Generate Report
      </Button>

      <Button
        variant="outline"
        className="w-full h-12 uppercase tracking-widest text-sm font-bold bg-transparent border-muted-foreground text-muted-foreground hover:bg-muted"
        onClick={onReset}
        data-testid="button-reset"
      >
        ← New Assessment
      </Button>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        result={result}
        inputs={inputs}
        marineName={marineName}
      />
    </div>
  );
}
