import { useState } from "react";
import { CheckCircle2, Zap, XCircle, ShieldCheck, TrendingUp, ArrowDown, Minus, FileText } from "lucide-react";
import { ResultCard } from "./ResultCard";
import { Button } from "@/components/ui/button";
import { RegResult } from "@/lib/marineStandards";
import { WATCH_ZONE } from "@/lib/usmcStandards";
import { FormData } from "@/lib/validation";
import { ReportModal } from "./ReportModal";
import { ReadinessPlanner } from "./ReadinessPlanner";
import { SaveProfileButton } from "./ProfileLoader";
import { ProgressTracker } from "./ProgressTracker";

// ── What Do I Need? ─────────────────────────────────────────────────────────

type RowStatus = "good" | "watch" | "fail";

interface NeedRow {
  label: string;
  status: RowStatus;
  primary: string;
  sub?: string;
}

function NeedRowCard({ row }: { row: NeedRow }) {
  const colors: Record<RowStatus, { border: string; bg: string; badge: string; text: string; icon: React.ReactNode }> = {
    good:  { border: "border-primary/40",     bg: "bg-primary/5",      badge: "bg-primary text-primary-foreground",         text: "text-primary",     icon: <Minus   className="w-3.5 h-3.5 shrink-0" /> },
    watch: { border: "border-yellow-500/50",  bg: "bg-yellow-500/10",  badge: "bg-yellow-500 text-white",                   text: "text-yellow-600",  icon: <Zap     className="w-3.5 h-3.5 shrink-0" /> },
    fail:  { border: "border-destructive/50", bg: "bg-destructive/10", badge: "bg-destructive text-destructive-foreground",  text: "text-destructive", icon: <ArrowDown className="w-3.5 h-3.5 shrink-0" /> },
  };
  const c = colors[row.status];
  return (
    <div className={`border rounded-md px-4 py-3 flex items-start justify-between gap-3 ${c.border} ${c.bg}`}>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">{row.label}</p>
        <p className={`text-sm font-mono font-bold leading-snug ${c.text}`}>{row.primary}</p>
        {row.sub && <p className="text-xs text-muted-foreground mt-0.5">{row.sub}</p>}
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded whitespace-nowrap ${c.badge}`}>
        {c.icon}
        {row.status === "good" ? "Good" : row.status === "watch" ? "Watch" : "Reduce"}
      </div>
    </div>
  );
}

function WhatDoINeed({ result }: { result: RegResult }) {
  const rows: NeedRow[] = [];

  // ── Weight ───────────────────────────────────────────────────────────────
  const weightGap = result.currentWeight - result.maxAllowableWeight;
  if (weightGap > 0) {
    rows.push({
      label: "Weight",
      status: "fail",
      primary: `Lose ${weightGap} lb${weightGap !== 1 ? "s" : ""} to meet H/W table`,
      sub: `${result.currentWeight} lbs / ${result.maxAllowableWeight} lb limit`,
    });
  } else if (Math.abs(weightGap) <= WATCH_ZONE.WEIGHT_LBS) {
    rows.push({
      label: "Weight",
      status: "watch",
      primary: `${Math.abs(weightGap)} lb${Math.abs(weightGap) !== 1 ? "s" : ""} under limit — within watch zone`,
      sub: `${result.currentWeight} lbs / ${result.maxAllowableWeight} lb limit`,
    });
  } else {
    rows.push({
      label: "Weight",
      status: "good",
      primary: `${Math.abs(weightGap)} lbs under H/W limit`,
      sub: `${result.currentWeight} lbs / ${result.maxAllowableWeight} lb limit`,
    });
  }

  // ── WHtR / Waist ─────────────────────────────────────────────────────────
  if (result.whtrMaxWaist !== null) {
    const waistGap = Math.round((result.waistInches - result.whtrMaxWaist) * 10) / 10;
    if (waistGap > 0) {
      rows.push({
        label: "Waist (WHtR ≤ 0.52)",
        status: "fail",
        primary: `Reduce waist by ${waistGap}" to pass WHtR screening`,
        sub: `${result.waistInches}" waist / ${result.whtrMaxWaist}" max at your height`,
      });
    } else if (Math.abs(waistGap) <= 0.5) {
      rows.push({
        label: "Waist (WHtR ≤ 0.52)",
        status: "watch",
        primary: `${Math.abs(waistGap)}" under WHtR waist limit — tight margin`,
        sub: `${result.waistInches}" waist / ${result.whtrMaxWaist}" max at your height`,
      });
    } else {
      rows.push({
        label: "Waist (WHtR ≤ 0.52)",
        status: "good",
        primary: `${Math.abs(waistGap)}" under WHtR waist limit`,
        sub: `${result.waistInches}" waist / ${result.whtrMaxWaist}" max at your height`,
      });
    }
  }

  // ── Body Fat ─────────────────────────────────────────────────────────────
  const bfGap = Math.round((result.estimatedBodyFat - result.effectiveMaxBodyFat) * 10) / 10;
  if (bfGap > 0) {
    rows.push({
      label: "Body Fat",
      status: "fail",
      primary: `${bfGap}% over limit — estimated ~${Math.ceil(bfGap / 1.1)}" waist reduction`,
      sub: `${result.estimatedBodyFat}% est. / ${result.effectiveMaxBodyFat}% limit`,
    });
  } else if (Math.abs(bfGap) <= WATCH_ZONE.BODY_FAT_PCT) {
    rows.push({
      label: "Body Fat",
      status: "watch",
      primary: `${Math.abs(bfGap)}% from limit — within watch zone`,
      sub: `${result.estimatedBodyFat}% est. / ${result.effectiveMaxBodyFat}% limit`,
    });
  } else {
    rows.push({
      label: "Body Fat",
      status: "good",
      primary: `${Math.abs(bfGap)}% under BF limit`,
      sub: `${result.estimatedBodyFat}% est. / ${result.effectiveMaxBodyFat}% limit`,
    });
  }

  const allGood = rows.every((r) => r.status === "good");

  return (
    <div>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest">
          <span className="bg-background px-2 text-muted-foreground">What Do I Need?</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {allGood ? (
          <div className="border border-primary/40 bg-primary/5 rounded-md px-4 py-3 flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm text-primary font-mono font-bold">No immediate reduction required</p>
          </div>
        ) : (
          rows.map((row) => <NeedRowCard key={row.label} row={row} />)
        )}
        {!allGood && (
          <p className="text-xs text-muted-foreground px-1">
            Estimates based on tape-method screening. BIA via InBody 770 is the official measurement per MCBul 6110.
          </p>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

interface ResultSectionProps {
  result: RegResult;
  inputs: FormData;
  pftScore: number;
  cftScore: number;
  onReset: () => void;
  activeProfileId: string | null;
  onProfileSaved: (id: string) => void;
}

export function ResultSection({ result, inputs, pftScore, cftScore, onReset, activeProfileId, onProfileSaved }: ResultSectionProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const getBannerConfig = () => {
    switch (result.riskLevel) {
      case "In Regs":
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-primary" />,
          color: "text-primary",
          borderColor: "border-primary",
          bgColor: "bg-primary/10",
        };
      case "Watch Zone":
        return {
          icon: <Zap className="w-5 h-5 text-yellow-500" />,
          color: "text-yellow-500",
          borderColor: "border-yellow-500",
          bgColor: "bg-yellow-500/10",
        };
      case "Out of Regs":
        return {
          icon: <XCircle className="w-5 h-5 text-destructive" />,
          color: "text-destructive",
          borderColor: "border-destructive",
          bgColor: "bg-destructive/10",
        };
    }
  };

  const banner = getBannerConfig();

  const getFitnessColor = (score: number) => {
    if (score >= 225) return "green";
    if (score >= 150) return "yellow";
    return "red";
  };

  return (
    <div className="flex flex-col gap-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Performance Score Banner (MARADMIN 066/26) */}
      {result.performanceExempt && (
        <div
          className="border-2 border-primary bg-primary/10 p-4 flex items-center gap-3"
          data-testid="performance-exempt-banner"
        >
          <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary/70 mb-0.5">
              High-Performance BF Cap (MARADMIN 066/26)
            </p>
            <p className="text-sm text-primary font-medium">
              Both PFT &amp; CFT ≥ {result.bestFitnessScore} — BF limit raised to {result.effectiveMaxBodyFat}% (standard raised from {result.maxBodyFat}%)
            </p>
          </div>
        </div>
      )}

      {result.performanceAllowance && (
        <div
          className="border border-primary/40 bg-primary/5 p-3 flex items-center gap-3"
          data-testid="performance-allowance-banner"
        >
          <TrendingUp className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs text-primary/80 font-mono">
            Both PFT &amp; CFT ≥ {result.bestFitnessScore} — +1% BF allowance applied
            (base {result.maxBodyFat}% → effective {result.effectiveMaxBodyFat}%) per MARADMIN 066/26
          </p>
        </div>
      )}

      {/* Status Banner */}
      <div
        className={`border-2 p-4 flex items-center justify-between ${banner.borderColor} ${banner.bgColor}`}
        data-testid="status-banner"
      >
        <div className="flex items-center gap-3">
          {banner.icon}
          <h2 className={`font-bold text-lg tracking-wider uppercase ${banner.color}`}>
            {result.riskLevel}
          </h2>
        </div>
        <div
          className={`px-2 py-1 text-xs font-bold uppercase border ${
            result.passFailStatus === "PASS"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-destructive text-destructive-foreground border-destructive"
          }`}
        >
          {result.passFailStatus}
        </div>
      </div>

      {/* Assessment Summary */}
      <div className="bg-card border border-border p-4 text-sm leading-relaxed text-card-foreground">
        {result.message}
      </div>

      {/* Key Metrics */}
      <>
        <div className="grid grid-cols-2 gap-4">
            <ResultCard
              label={`Body Weight / ${result.maxAllowableWeight} lb max`}
              value={result.currentWeight}
              unit="lbs"
              accent={result.overWeightLimit ? "red" : "green"}
              data-testid="text-weight"
            />
            <ResultCard
              label={`Body Fat Est. / ${result.effectiveMaxBodyFat}% limit`}
              value={result.estimatedBodyFat}
              unit="%"
              accent={result.estimatedBodyFat > result.effectiveMaxBodyFat ? "red" : "green"}
              data-testid="text-body-fat"
            />
          </div>

          {/* WHtR Ratio */}
          <div className={`border rounded-md px-4 py-3 flex items-center justify-between ${
            result.whtrPass
              ? "border-primary/40 bg-primary/5"
              : "border-destructive/40 bg-destructive/5"
          }`}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                Waist-to-Height Ratio (WHtR)
              </p>
              <p className={`text-2xl font-mono font-bold ${result.whtrPass ? "text-primary" : "text-destructive"}`}>
                {result.whtrRatio.toFixed(3)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Standard: &lt; 0.52
                {result.whtrMaxWaist !== null && ` — max waist ${result.whtrMaxWaist}" at your height`}
              </p>
            </div>
            <div className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${
              result.whtrPass
                ? "bg-primary text-primary-foreground"
                : "bg-destructive text-destructive-foreground"
            }`}>
              {result.whtrPass ? "Pass" : "Fail"}
            </div>
          </div>

          {/* BIA Verification Note */}
          <p className="text-xs text-muted-foreground border border-border/50 px-3 py-2 leading-relaxed">
            Tape method is a screening estimate. Formal BCP assignment requires BIA verification
            via InBody 770 (IB770) within 7 working days per MCBul 6110.
          </p>
      </>

      {/* Fitness Scores */}
      <div className="grid grid-cols-2 gap-4">
        <ResultCard
          label="PFT Score / 300"
          value={pftScore}
          accent={getFitnessColor(pftScore)}
        />
        <ResultCard
          label="CFT Score / 300"
          value={cftScore}
          accent={getFitnessColor(cftScore)}
        />
      </div>

      {/* What Do I Need? */}
      <WhatDoINeed result={result} />

      {/* Readiness Planner */}
      <ReadinessPlanner result={result} inputs={inputs} />

      {/* Progress Tracker — only shown if profile is saved */}
      {activeProfileId && (
        <ProgressTracker
          profileId={activeProfileId}
          currentWeight={result.currentWeight}
          maxAllowableWeight={result.maxAllowableWeight}
        />
      )}

      {/* Save / Update profile */}
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
      />
    </div>
  );
}
