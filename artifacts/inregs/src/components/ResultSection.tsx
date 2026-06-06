import { CheckCircle2, Zap, XCircle } from "lucide-react";
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

      <div className="bg-card border border-border p-4 text-sm leading-relaxed text-card-foreground">
        {result.message}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ResultCard
          label={`Body Weight / ${result.maxAllowableWeight}`}
          value={result.currentWeight}
          unit="lbs"
          accent={result.overWeightLimit ? "red" : "green"}
          data-testid="text-weight"
        />
        <ResultCard
          label={`Body Fat Est. / ${result.maxBodyFat}%`}
          value={result.estimatedBodyFat}
          unit="%"
          accent={result.estimatedBodyFat > result.maxBodyFat ? "red" : "green"}
          data-testid="text-body-fat"
        />
      </div>

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

      {(result.poundsToLose !== null || result.waistToLose !== null) && (
        <div className="bg-destructive/10 border border-destructive/50 p-4">
          <h3 className="text-destructive font-bold text-sm mb-2 uppercase tracking-wide">
            Recommendations
          </h3>
          <ul className="text-sm text-card-foreground space-y-1">
            {result.poundsToLose !== null && (
              <li>Weight Reduction Needed: {result.poundsToLose} lbs</li>
            )}
            {result.waistToLose !== null && (
              <li>Waist Reduction Est.: {result.waistToLose} inches</li>
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
