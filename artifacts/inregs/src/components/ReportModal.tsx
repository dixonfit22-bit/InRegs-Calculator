import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Printer } from "lucide-react";
import { RegResult } from "@/lib/marineStandards";
import { FormData } from "@/lib/validation";
import { WATCH_ZONE } from "@/lib/usmcStandards";

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  result: RegResult;
  inputs: FormData;
}

const DISCLAIMER =
  "InRegs is an unofficial informational tool and is not affiliated with the United States Marine Corps. " +
  "Users should verify all results against current Marine Corps orders and directives.";

const SOURCES = [
  "MCBul 6110, 20 Dec 2024",
  "MARADMIN 066/26, effective 1 Jan 2026",
];

function formatHeight(h: string) {
  const total = Number(h);
  if (!total) return `${h}"`;
  const ft = Math.floor(total / 12);
  const ins = total % 12;
  return `${ft}'${ins}" (${total} in)`;
}

function buildNeedItems(result: RegResult): string[] {
  const items: string[] = [];
  const weightGap = result.currentWeight - result.maxAllowableWeight;
  if (weightGap > 0) {
    items.push(`Weight: Lose ${weightGap} lb${weightGap !== 1 ? "s" : ""} to meet H/W table (${result.currentWeight} lbs / ${result.maxAllowableWeight} lb limit)`);
  } else if (Math.abs(weightGap) <= WATCH_ZONE.WEIGHT_LBS) {
    items.push(`Weight: ${Math.abs(weightGap)} lbs under limit — within watch zone (${result.currentWeight} lbs / ${result.maxAllowableWeight} lb limit)`);
  } else {
    items.push(`Weight: ${Math.abs(weightGap)} lbs under H/W limit — good (${result.currentWeight} lbs / ${result.maxAllowableWeight} lb limit)`);
  }
  if (result.whtrMaxWaist !== null) {
    const waistGap = Math.round((result.waistInches - result.whtrMaxWaist) * 10) / 10;
    if (waistGap > 0) {
      items.push(`Waist (WHtR): Reduce waist by ${waistGap}" to pass WHtR screening (${result.waistInches}" / ${result.whtrMaxWaist}" max)`);
    } else if (Math.abs(waistGap) <= 0.5) {
      items.push(`Waist (WHtR): ${Math.abs(waistGap)}" under WHtR waist limit — tight margin`);
    } else {
      items.push(`Waist (WHtR): ${Math.abs(waistGap)}" under WHtR waist limit — good`);
    }
  }
  const bfGap = Math.round((result.estimatedBodyFat - result.effectiveMaxBodyFat) * 10) / 10;
  if (bfGap > 0) {
    items.push(`Body Fat: ${bfGap}% over limit — reduce (${result.estimatedBodyFat}% / ${result.effectiveMaxBodyFat}% limit)`);
  } else if (Math.abs(bfGap) <= WATCH_ZONE.BODY_FAT_PCT) {
    items.push(`Body Fat: ${Math.abs(bfGap)}% from limit — within watch zone (${result.estimatedBodyFat}% / ${result.effectiveMaxBodyFat}% limit)`);
  } else {
    items.push(`Body Fat: ${Math.abs(bfGap)}% under BF limit — good (${result.estimatedBodyFat}% / ${result.effectiveMaxBodyFat}% limit)`);
  }
  return items;
}

function buildPlainText(result: RegResult, inputs: FormData, generated: string): string {
  const needItems = buildNeedItems(result);
  const perfNote = result.performanceExempt
    ? `Both PFT & CFT ≥ 285 — BF cap raised to ${result.effectiveMaxBodyFat}% (MARADMIN 066/26)`
    : result.performanceAllowance
    ? `Both PFT & CFT ≥ 250 — +1% BF allowance applied, effective limit ${result.effectiveMaxBodyFat}% (MARADMIN 066/26)`
    : null;

  const lines = [
    "INREGS — USMC BCP ASSESSMENT REPORT",
    `Generated: ${generated}`,
    "─".repeat(44),
    "",
    "PERSONAL INFO",
    `Sex:     ${inputs.sex ? inputs.sex.charAt(0).toUpperCase() + inputs.sex.slice(1) : "—"}`,
    `Age:     ${inputs.age || "—"}`,
    `Height:  ${formatHeight(inputs.heightInches)}`,
    `Weight:  ${inputs.weightLbs || "—"} lbs`,
    "",
    "MEASUREMENTS",
    `Neck:    ${inputs.neckInches || "—"} in`,
    `Waist:   ${inputs.waistInches || "—"} in`,
    ...(inputs.hipInches ? [`Hip:     ${inputs.hipInches} in`] : []),
    "",
    "FITNESS SCORES",
    `PFT:     ${inputs.pftScore || "—"} / 300`,
    `CFT:     ${inputs.cftScore || "—"} / 300`,
    ...(perfNote ? ["", `Performance: ${perfNote}`] : []),
    "",
    "─".repeat(44),
    "",
    `OVERALL STATUS: ${result.riskLevel.toUpperCase()}`,
    `PASS / FAIL:    ${result.passFailStatus}`,
    "",
    "ASSESSMENT RESULTS",
    `Max Allowable Weight:  ${result.maxAllowableWeight} lbs`,
    `Estimated Body Fat:    ${result.estimatedBodyFat}%`,
    `Body Fat Limit:        ${result.effectiveMaxBodyFat}% (base ${result.maxBodyFat}%)`,
    `WHtR Ratio:            ${result.whtrRatio.toFixed(3)} ${result.whtrPass ? "✓ PASS" : "✗ FAIL"} (standard ≤ 0.52)`,
    ...(result.whtrMaxWaist !== null ? [`Max Waist (WHtR):      ${result.whtrMaxWaist}" at your height`] : []),
    "",
    "─".repeat(44),
    "",
    "WHAT DO I NEED?",
    ...needItems.map(i => `• ${i}`),
    "",
    "─".repeat(44),
    "",
    "SOURCES",
    ...SOURCES.map(s => `• ${s}`),
    "",
    "─".repeat(44),
    "",
    "DISCLAIMER",
    DISCLAIMER,
  ];
  return lines.join("\n");
}

function printReport(result: RegResult, inputs: FormData, generated: string) {
  const needItems = buildNeedItems(result);
  const perfNote = result.performanceExempt
    ? `Both PFT &amp; CFT ≥ 285 — BF cap raised to ${result.effectiveMaxBodyFat}% (MARADMIN 066/26)`
    : result.performanceAllowance
    ? `Both PFT &amp; CFT ≥ 250 — +1% BF allowance, effective limit ${result.effectiveMaxBodyFat}% (MARADMIN 066/26)`
    : null;

  const statusColor = result.riskLevel === "In Regs" ? "#2563eb" : result.riskLevel === "Watch Zone" ? "#d97706" : "#dc2626";
  const sexLabel = inputs.sex ? inputs.sex.charAt(0).toUpperCase() + inputs.sex.slice(1) : "—";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>InRegs BCP Report — ${generated}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #111; background: #fff; padding: 32px; max-width: 600px; margin: 0 auto; }
  h1 { font-size: 20px; letter-spacing: 0.15em; color: #2563eb; margin-bottom: 2px; }
  h2 { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #555; margin-bottom: 4px; }
  .subtitle { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #444; margin-bottom: 2px; }
  .generated { font-size: 10px; color: #888; margin-bottom: 16px; }
  hr { border: none; border-top: 1px solid #ccc; margin: 12px 0; }
  .section { margin-bottom: 12px; }
  .section-title { font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.15em; color: #888; margin-bottom: 6px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
  .field label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; display: block; margin-bottom: 1px; }
  .field span { font-size: 12px; font-weight: bold; }
  .status-banner { border: 2px solid ${statusColor}; padding: 10px 14px; margin: 12px 0; display: flex; justify-content: space-between; align-items: center; }
  .status-label { font-size: 16px; font-weight: bold; color: ${statusColor}; letter-spacing: 0.1em; text-transform: uppercase; }
  .pf-badge { background: ${result.passFailStatus === "PASS" ? "#2563eb" : "#dc2626"}; color: white; font-size: 10px; font-weight: bold; padding: 3px 8px; letter-spacing: 0.1em; }
  .need-item { font-size: 11px; margin-bottom: 3px; padding-left: 12px; }
  .need-item::before { content: "• "; }
  .source-item { font-size: 10px; color: #555; margin-bottom: 2px; }
  .perf-note { background: #eff6ff; border: 1px solid #bfdbfe; padding: 6px 10px; font-size: 10px; color: #1d4ed8; margin: 8px 0; }
  .disclaimer { background: #fafafa; border: 1px solid #e5e7eb; padding: 8px 10px; font-size: 9px; color: #6b7280; line-height: 1.5; margin-top: 12px; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <h1>IN REGS</h1>
  <p class="subtitle">USMC BCP Assessment Report</p>
  <p class="generated">Generated: ${generated}</p>
  <hr/>

  <div class="section">
    <div class="section-title">Personal Info</div>
    <div class="grid2">
      <div class="field"><label>Sex</label><span>${sexLabel}</span></div>
      <div class="field"><label>Age</label><span>${inputs.age || "—"}</span></div>
      <div class="field"><label>Height</label><span>${formatHeight(inputs.heightInches)}</span></div>
      <div class="field"><label>Weight</label><span>${inputs.weightLbs || "—"} lbs</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Measurements</div>
    <div class="grid2">
      <div class="field"><label>Neck</label><span>${inputs.neckInches || "—"} in</span></div>
      <div class="field"><label>Waist</label><span>${inputs.waistInches || "—"} in</span></div>
      ${inputs.hipInches ? `<div class="field"><label>Hip</label><span>${inputs.hipInches} in</span></div>` : ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Fitness Scores</div>
    <div class="grid2">
      <div class="field"><label>PFT</label><span>${inputs.pftScore || "—"} / 300</span></div>
      <div class="field"><label>CFT</label><span>${inputs.cftScore || "—"} / 300</span></div>
    </div>
    ${perfNote ? `<div class="perf-note">${perfNote}</div>` : ""}
  </div>

  <hr/>
  <div class="status-banner">
    <span class="status-label">${result.riskLevel}</span>
    <span class="pf-badge">${result.passFailStatus}</span>
  </div>

  <div class="section">
    <div class="section-title">Assessment Results</div>
    <div class="grid2">
      <div class="field"><label>Max Allowable Weight</label><span>${result.maxAllowableWeight} lbs</span></div>
      <div class="field"><label>Estimated Body Fat</label><span>${result.estimatedBodyFat}%</span></div>
      <div class="field"><label>Body Fat Limit</label><span>${result.effectiveMaxBodyFat}% (base ${result.maxBodyFat}%)</span></div>
      <div class="field"><label>WHtR Ratio</label><span>${result.whtrRatio.toFixed(3)} — ${result.whtrPass ? "PASS" : "FAIL"}</span></div>
      ${result.whtrMaxWaist !== null ? `<div class="field"><label>Max Waist (WHtR)</label><span>${result.whtrMaxWaist}" at your height</span></div>` : ""}
    </div>
  </div>

  <hr/>
  <div class="section">
    <div class="section-title">What Do I Need?</div>
    ${needItems.map(i => `<div class="need-item">${i}</div>`).join("")}
  </div>

  <hr/>
  <div class="section">
    <div class="section-title">Sources</div>
    ${SOURCES.map(s => `<div class="source-item">• ${s}</div>`).join("")}
  </div>

  <div class="disclaimer">
    <strong>UNOFFICIAL DISCLAIMER</strong><br/>
    ${DISCLAIMER}
  </div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=700,height=900");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

export function ReportModal({ open, onClose, result, inputs }: ReportModalProps) {
  const [copied, setCopied] = useState(false);
  const generated = new Date().toLocaleString("en-US", {
    month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  const handleCopy = async () => {
    const text = buildPlainText(result, inputs, generated);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => printReport(result, inputs, generated);

  const needItems = buildNeedItems(result);
  const allGood = needItems.every(i => i.includes("— good"));
  const sexLabel = inputs.sex ? inputs.sex.charAt(0).toUpperCase() + inputs.sex.slice(1) : "—";
  const statusColor = result.riskLevel === "In Regs"
    ? "border-primary text-primary"
    : result.riskLevel === "Watch Zone"
    ? "border-yellow-500 text-yellow-600"
    : "border-destructive text-destructive";
  const perfNote = result.performanceExempt
    ? `Both PFT & CFT ≥ 285 — BF cap raised to ${result.effectiveMaxBodyFat}% (MARADMIN 066/26)`
    : result.performanceAllowance
    ? `Both PFT & CFT ≥ 250 — +1% BF allowance, effective limit ${result.effectiveMaxBodyFat}% (MARADMIN 066/26)`
    : null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Action bar */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center justify-between gap-2">
          <DialogHeader className="p-0">
            <DialogTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Assessment Report
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs uppercase tracking-widest font-bold gap-1.5"
              onClick={handleCopy}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs uppercase tracking-widest font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handlePrint}
            >
              <Printer className="w-3.5 h-3.5" />
              Print / PDF
            </Button>
          </div>
        </div>

        {/* Report content */}
        <div className="px-5 py-4 font-mono text-sm flex flex-col gap-0">

          {/* Header */}
          <div className="pb-4 border-b border-border">
            <h2 className="text-xl font-bold tracking-wider text-primary">IN REGS</h2>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mt-0.5">USMC BCP Assessment Report</p>
            <p className="text-xs text-muted-foreground mt-1">{generated}</p>
          </div>

          {/* Personal Info */}
          <ReportSection label="Personal Info">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <ReportField label="Sex" value={sexLabel} />
              <ReportField label="Age" value={`${inputs.age || "—"}`} />
              <ReportField label="Height" value={formatHeight(inputs.heightInches)} />
              <ReportField label="Weight" value={`${inputs.weightLbs || "—"} lbs`} />
            </div>
          </ReportSection>

          {/* Measurements */}
          <ReportSection label="Measurements">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <ReportField label="Neck" value={`${inputs.neckInches || "—"} in`} />
              <ReportField label="Waist" value={`${inputs.waistInches || "—"} in`} />
              {inputs.hipInches && <ReportField label="Hip" value={`${inputs.hipInches} in`} />}
            </div>
          </ReportSection>

          {/* Fitness */}
          <ReportSection label="Fitness Scores">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <ReportField label="PFT" value={`${inputs.pftScore || "—"} / 300`} />
              <ReportField label="CFT" value={`${inputs.cftScore || "—"} / 300`} />
            </div>
            {perfNote && (
              <p className="text-xs text-primary bg-primary/5 border border-primary/30 px-3 py-2 mt-2 leading-relaxed">
                {perfNote}
              </p>
            )}
          </ReportSection>

          {/* Status */}
          <div className={`border-2 px-4 py-3 my-3 flex items-center justify-between ${statusColor.split(" ")[0]} bg-transparent`}>
            <span className={`font-bold text-base tracking-widest uppercase ${statusColor.split(" ")[1]}`}>
              {result.riskLevel}
            </span>
            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 ${
              result.passFailStatus === "PASS"
                ? "bg-primary text-primary-foreground"
                : "bg-destructive text-destructive-foreground"
            }`}>
              {result.passFailStatus}
            </span>
          </div>

          {/* Assessment Results */}
          <ReportSection label="Assessment Results">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <ReportField label="Max Weight" value={`${result.maxAllowableWeight} lbs`} />
              <ReportField label="Body Fat Est." value={`${result.estimatedBodyFat}%`} />
              <ReportField label="BF Limit" value={`${result.effectiveMaxBodyFat}% (base ${result.maxBodyFat}%)`} />
              <ReportField
                label="WHtR"
                value={`${result.whtrRatio.toFixed(3)} — ${result.whtrPass ? "PASS" : "FAIL"}`}
                accent={result.whtrPass ? "text-primary" : "text-destructive"}
              />
              {result.whtrMaxWaist !== null && (
                <ReportField label="Max Waist (WHtR)" value={`${result.whtrMaxWaist}" at your height`} />
              )}
            </div>
          </ReportSection>

          {/* What Do I Need */}
          <ReportSection label="What Do I Need?">
            {allGood ? (
              <p className="text-xs text-primary font-bold">No immediate reduction required</p>
            ) : (
              <ul className="space-y-1">
                {needItems.map((item) => (
                  <li key={item} className="text-xs leading-relaxed flex gap-2">
                    <span className="text-muted-foreground shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </ReportSection>

          {/* Sources */}
          <ReportSection label="Sources">
            <ul className="space-y-0.5">
              {SOURCES.map((s) => (
                <li key={s} className="text-xs text-muted-foreground flex gap-2">
                  <span className="shrink-0">•</span><span>{s}</span>
                </li>
              ))}
            </ul>
          </ReportSection>

          {/* Disclaimer */}
          <div className="mt-2 border border-border/60 bg-muted/30 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Unofficial Disclaimer
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{DISCLAIMER}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReportSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-border/50">
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
      {children}
    </div>
  );
}

function ReportField({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold font-mono ${accent ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}
