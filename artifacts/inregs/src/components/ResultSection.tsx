import { CheckCircle2, Zap, XCircle, ShieldCheck, TrendingUp } from "lucide-react";
import { ResultCard } from "./ResultCard";
import { Button } from "@/components/ui/button";
import { RegResult } from "@/lib/marineStandards";

interface ResultSectionProps {
  result: RegResult;
  pftScore: number;
  cftScore: number;
  onReset: () => void;
}

export function ResultSection({ result, pftScore, cftScore, onReset }: ResultSectionProps) {
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

      {/* Recommendations */}
      {(result.poundsToLose !== null || result.waistToLose !== null) && (
        <div className="bg-destructive/10 border border-destructive/50 p-4">
          <h3 className="text-destructive font-bold text-sm mb-2 uppercase tracking-wide">
            Recommendations
          </h3>
          <ul className="text-sm text-card-foreground space-y-1">
            {result.poundsToLose !== null && (
              <li>Weight Reduction Needed: <span className="font-bold">{result.poundsToLose} lbs</span></li>
            )}
            {result.waistToLose !== null && (
              <li>Waist Reduction Est.: <span className="font-bold">{result.waistToLose} inches</span></li>
            )}
          </ul>
        </div>
      )}

      <Button
        variant="outline"
        className="w-full mt-4 h-12 uppercase tracking-widest text-sm font-bold bg-transparent border-muted-foreground text-muted-foreground hover:bg-muted"
        onClick={onReset}
        data-testid="button-reset"
      >
        ← New Assessment
      </Button>
    </div>
  );
}
