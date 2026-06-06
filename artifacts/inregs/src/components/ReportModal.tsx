import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Check, Printer, ArrowLeft } from "lucide-react";
import { RegResult } from "@/lib/marineStandards";
import { FormData } from "@/lib/validation";
import { WATCH_ZONE } from "@/lib/usmcStandards";

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  result: RegResult;
  inputs: FormData;
  marineName?: string;
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

// ── Status helpers ────────────────────────────────────────────────────────────

function statusPalette(riskLevel: string) {
  if (riskLevel === "In Regs")    return { bg: "#1e3a5f", accent: "#2563eb", text: "#60a5fa", badge: "#2563eb" };
  if (riskLevel === "Watch Zone") return { bg: "#3d2500", accent: "#d97706", text: "#fbbf24", badge: "#d97706" };
  return                                 { bg: "#3d0000", accent: "#dc2626", text: "#f87171", badge: "#dc2626" };
}

// ── Plain-text copy ───────────────────────────────────────────────────────────

function buildPlainText(result: RegResult, inputs: FormData, generated: string, marineName?: string): string {
  const needItems = buildNeedItems(result);
  const perfNote = result.performanceExempt
    ? `Both PFT & CFT ≥ 285 — BF cap raised to ${result.effectiveMaxBodyFat}% (MARADMIN 066/26)`
    : result.performanceAllowance
    ? `Both PFT & CFT ≥ 250 — +1% BF allowance applied, effective limit ${result.effectiveMaxBodyFat}% (MARADMIN 066/26)`
    : null;

  const lines = [
    "INREGS — USMC BCP ASSESSMENT REPORT",
    `Generated: ${generated}`,
    ...(marineName ? [`Marine:   ${marineName}`] : []),
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

// ── Print / PDF ───────────────────────────────────────────────────────────────

function printReport(result: RegResult, inputs: FormData, generated: string, marineName?: string) {
  const needItems = buildNeedItems(result);
  const pal = statusPalette(result.riskLevel);
  const perfNote = result.performanceExempt
    ? `Both PFT &amp; CFT ≥ 285 — BF cap raised to ${result.effectiveMaxBodyFat}% (MARADMIN 066/26)`
    : result.performanceAllowance
    ? `Both PFT &amp; CFT ≥ 250 — +1% BF allowance, effective limit ${result.effectiveMaxBodyFat}% (MARADMIN 066/26)`
    : null;
  const sexLabel = inputs.sex ? inputs.sex.charAt(0).toUpperCase() + inputs.sex.slice(1) : "—";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>InRegs BCP Report — ${generated}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 11px; color: #1e293b; background: #e8eef5; padding: 20px; }
  .page { max-width: 640px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(13,31,60,0.18); }

  /* Header bar */
  .header-bar { background: linear-gradient(135deg, #0d1f3c 0%, #112a54 60%, #1e4d8c 100%); padding: 20px 24px 18px; }
  .brand { font-family: 'Rajdhani', 'JetBrains Mono', monospace; font-size: 26px; font-weight: 700; color: #fff; letter-spacing: 0.1em; }
  .brand-sub { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; color: #7eb3ff; margin-top: 2px; }
  .report-meta { margin-top: 10px; font-size: 9px; color: rgba(180,210,255,0.7); letter-spacing: 0.08em; text-transform: uppercase; }
  .report-marine { font-size: 13px; font-weight: 700; color: #fff; margin-top: 4px; }

  /* Status banner */
  .status-banner { padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; background: ${pal.bg}; }
  .status-label { font-family: 'Rajdhani', 'JetBrains Mono', monospace; font-size: 22px; font-weight: 700; color: ${pal.text}; letter-spacing: 0.08em; text-transform: uppercase; }
  .pf-badge { background: ${result.passFailStatus === "PASS" ? "#2563eb" : "#dc2626"}; color: #fff; font-size: 10px; font-weight: 700; padding: 5px 12px; border-radius: 20px; letter-spacing: 0.12em; text-transform: uppercase; }

  /* Body */
  .body { padding: 0 24px 24px; }

  /* Section card */
  .section { background: #f8fafc; border-radius: 12px; padding: 14px 16px; margin-top: 14px; }
  .section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .section-accent { width: 3px; height: 18px; border-radius: 2px; flex-shrink: 0; }
  .section-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; color: #64748b; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
  .field label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; display: block; margin-bottom: 2px; }
  .field span { font-size: 12px; font-weight: 700; color: #1e293b; }

  /* Perf note */
  .perf-note { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px 12px; font-size: 10px; color: #1d4ed8; margin-top: 8px; line-height: 1.5; }

  /* Need item */
  .need-item { font-size: 10px; color: #334155; line-height: 1.6; margin-bottom: 4px; padding-left: 12px; position: relative; }
  .need-item::before { content: "•"; position: absolute; left: 0; color: #2563eb; }

  /* Sources */
  .source-item { font-size: 10px; color: #64748b; margin-bottom: 3px; padding-left: 12px; position: relative; }
  .source-item::before { content: "•"; position: absolute; left: 0; color: #94a3b8; }

  /* Disclaimer */
  .disclaimer { background: #f1f5f9; border-radius: 10px; padding: 12px 14px; margin-top: 14px; }
  .disclaimer-title { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; color: #94a3b8; margin-bottom: 4px; }
  .disclaimer-text { font-size: 9px; color: #64748b; line-height: 1.6; }

  @media print { body { background: #fff; padding: 0; } .page { box-shadow: none; border-radius: 0; } }
</style>
</head>
<body>
<div class="page">
  <div class="header-bar">
    <div class="brand">IN REGS</div>
    <div class="brand-sub">USMC BCP Assessment Report</div>
    ${marineName ? `<div class="report-marine">${marineName}</div>` : ""}
    <div class="report-meta">Generated: ${generated}</div>
  </div>

  <div class="status-banner">
    <span class="status-label">${result.riskLevel}</span>
    <span class="pf-badge">${result.passFailStatus}</span>
  </div>

  <div class="body">
    <div class="section">
      <div class="section-header">
        <div class="section-accent" style="background:#2563eb;"></div>
        <div class="section-title">Personal Info</div>
      </div>
      <div class="grid2">
        <div class="field"><label>Sex</label><span>${sexLabel}</span></div>
        <div class="field"><label>Age</label><span>${inputs.age || "—"}</span></div>
        <div class="field"><label>Height</label><span>${formatHeight(inputs.heightInches)}</span></div>
        <div class="field"><label>Weight</label><span>${inputs.weightLbs || "—"} lbs</span></div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-accent" style="background:#16a34a;"></div>
        <div class="section-title">Body Measurements</div>
      </div>
      <div class="grid2">
        <div class="field"><label>Neck</label><span>${inputs.neckInches || "—"} in</span></div>
        <div class="field"><label>Waist</label><span>${inputs.waistInches || "—"} in</span></div>
        ${inputs.hipInches ? `<div class="field"><label>Hip</label><span>${inputs.hipInches} in</span></div>` : ""}
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-accent" style="background:#d97706;"></div>
        <div class="section-title">Fitness Scores</div>
      </div>
      <div class="grid2">
        <div class="field"><label>PFT</label><span>${inputs.pftScore || "—"} / 300</span></div>
        <div class="field"><label>CFT</label><span>${inputs.cftScore || "—"} / 300</span></div>
      </div>
      ${perfNote ? `<div class="perf-note">${perfNote}</div>` : ""}
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-accent" style="background:${pal.accent};"></div>
        <div class="section-title">Assessment Results</div>
      </div>
      <div class="grid2">
        <div class="field"><label>Max Weight</label><span>${result.maxAllowableWeight} lbs</span></div>
        <div class="field"><label>Body Fat Est.</label><span>${result.estimatedBodyFat}%</span></div>
        <div class="field"><label>BF Limit</label><span>${result.effectiveMaxBodyFat}% (base ${result.maxBodyFat}%)</span></div>
        <div class="field"><label>WHtR Ratio</label><span style="color:${result.whtrPass ? "#2563eb" : "#dc2626"}">${result.whtrRatio.toFixed(3)} — ${result.whtrPass ? "PASS" : "FAIL"}</span></div>
        ${result.whtrMaxWaist !== null ? `<div class="field"><label>Max Waist (WHtR)</label><span>${result.whtrMaxWaist}" at your height</span></div>` : ""}
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-accent" style="background:#7c3aed;"></div>
        <div class="section-title">What Do I Need?</div>
      </div>
      ${needItems.map(i => `<div class="need-item">${i}</div>`).join("")}
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-accent" style="background:#64748b;"></div>
        <div class="section-title">Sources</div>
      </div>
      ${SOURCES.map(s => `<div class="source-item">${s}</div>`).join("")}
    </div>

    <div class="disclaimer">
      <div class="disclaimer-title">Unofficial Disclaimer</div>
      <div class="disclaimer-text">${DISCLAIMER}</div>
    </div>
  </div>
</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=720,height=960");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 500);
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function ReportModal({ open, onClose, result, inputs, marineName }: ReportModalProps) {
  const [copied, setCopied] = useState(false);
  const generated = new Date().toLocaleString("en-US", {
    month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  const handleCopy = async () => {
    const text = buildPlainText(result, inputs, generated, marineName);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => printReport(result, inputs, generated, marineName);

  const needItems   = buildNeedItems(result);
  const allGood     = needItems.every(i => i.includes("— good"));
  const sexLabel    = inputs.sex ? inputs.sex.charAt(0).toUpperCase() + inputs.sex.slice(1) : "—";
  const pal         = statusPalette(result.riskLevel);

  const perfNote = result.performanceExempt
    ? `Both PFT & CFT ≥ 285 — BF cap raised to ${result.effectiveMaxBodyFat}% (MARADMIN 066/26)`
    : result.performanceAllowance
    ? `Both PFT & CFT ≥ 250 — +1% BF allowance, effective limit ${result.effectiveMaxBodyFat}% (MARADMIN 066/26)`
    : null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto p-0 gap-0 sm:rounded-2xl [&>button:last-child]:hidden">

        {/* ── Sticky action bar ── */}
        <div
          className="sticky top-0 z-10 px-4 py-3 flex items-center gap-2"
          style={{ background: "linear-gradient(135deg, #0d1f3c 0%, #112a54 100%)" }}
        >
          <button
            onClick={onClose}
            aria-label="Back to app"
            className="flex items-center gap-1.5 h-8 px-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
            style={{ color: "rgba(180,210,255,0.75)" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <DialogHeader className="p-0 flex-1 min-w-0">
            <DialogTitle
              className="text-xs font-bold uppercase tracking-widest truncate"
              style={{ color: "rgba(150,190,255,0.6)" }}
            >
              Assessment Report
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold uppercase tracking-widest border transition-colors"
              style={{
                borderColor: "rgba(255,255,255,0.15)",
                color: copied ? "#86efac" : "rgba(180,210,255,0.85)",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
              style={{
                background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
                color: "#ffffff",
                boxShadow: "0 2px 8px rgba(37,99,235,0.4)",
              }}
            >
              <Printer className="w-3.5 h-3.5" />
              Print / PDF
            </button>
          </div>
        </div>

        {/* ── Hero / identity band ── */}
        <div
          style={{ background: "linear-gradient(135deg, #0d1f3c 0%, #1a3a6e 60%, #1e5799 100%)" }}
          className="px-5 py-5"
        >
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: "'Rajdhani', 'JetBrains Mono', monospace", color: "#fff", letterSpacing: "0.08em" }}
          >
            IN REGS
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: "#7eb3ff" }}>
            USMC BCP Assessment Report
          </p>
          {marineName && (
            <p className="text-sm font-bold font-mono text-white mt-2">{marineName}</p>
          )}
          <p className="text-[10px] mt-1" style={{ color: "rgba(150,190,255,0.6)" }}>{generated}</p>
        </div>

        {/* ── Status banner ── */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ background: pal.bg }}
        >
          <span
            className="text-xl font-bold uppercase tracking-widest"
            style={{ fontFamily: "'Rajdhani', 'JetBrains Mono', monospace", color: pal.text }}
          >
            {result.riskLevel}
          </span>
          <span
            className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full"
            style={{
              background: result.passFailStatus === "PASS" ? "#2563eb" : "#dc2626",
              color: "#ffffff",
            }}
          >
            {result.passFailStatus}
          </span>
        </div>

        {/* ── Report body ── */}
        <div
          className="flex flex-col gap-3 px-4 py-4"
          style={{ background: "#e8eef5" }}
        >
          <ReportCard label="Personal Info" accent="#2563eb">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <ReportField label="Sex"    value={sexLabel} />
              <ReportField label="Age"    value={`${inputs.age || "—"}`} />
              <ReportField label="Height" value={formatHeight(inputs.heightInches)} />
              <ReportField label="Weight" value={`${inputs.weightLbs || "—"} lbs`} />
            </div>
          </ReportCard>

          <ReportCard label="Body Measurements" accent="#16a34a">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <ReportField label="Neck"  value={`${inputs.neckInches || "—"} in`} />
              <ReportField label="Waist" value={`${inputs.waistInches || "—"} in`} />
              {inputs.hipInches && <ReportField label="Hip" value={`${inputs.hipInches} in`} />}
            </div>
          </ReportCard>

          <ReportCard label="Fitness Scores" accent="#d97706">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <ReportField label="PFT" value={`${inputs.pftScore || "—"} / 300`} />
              <ReportField label="CFT" value={`${inputs.cftScore || "—"} / 300`} />
            </div>
            {perfNote && (
              <div
                className="mt-3 px-3 py-2 rounded-xl text-xs leading-relaxed"
                style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8" }}
              >
                {perfNote}
              </div>
            )}
          </ReportCard>

          <ReportCard label="Assessment Results" accent={pal.accent}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <ReportField label="Max Weight"    value={`${result.maxAllowableWeight} lbs`} />
              <ReportField label="Body Fat Est." value={`${result.estimatedBodyFat}%`} />
              <ReportField label="BF Limit"      value={`${result.effectiveMaxBodyFat}% (base ${result.maxBodyFat}%)`} />
              <ReportField
                label="WHtR Ratio"
                value={`${result.whtrRatio.toFixed(3)} — ${result.whtrPass ? "PASS" : "FAIL"}`}
                valueColor={result.whtrPass ? "#2563eb" : "#dc2626"}
              />
              {result.whtrMaxWaist !== null && (
                <ReportField label="Max Waist (WHtR)" value={`${result.whtrMaxWaist}" at your height`} />
              )}
            </div>
          </ReportCard>

          <ReportCard label="What Do I Need?" accent="#7c3aed">
            {allGood ? (
              <p className="text-xs font-bold" style={{ color: "#16a34a" }}>
                No immediate reduction required — all metrics clear.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {needItems.map((item) => (
                  <li key={item} className="text-xs leading-relaxed flex gap-2" style={{ color: "#334155" }}>
                    <span className="shrink-0" style={{ color: "#2563eb" }}>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </ReportCard>

          <ReportCard label="Sources" accent="#64748b">
            <ul className="flex flex-col gap-1.5">
              {SOURCES.map((s) => (
                <li key={s} className="text-xs flex gap-2" style={{ color: "#64748b" }}>
                  <span className="shrink-0">•</span><span>{s}</span>
                </li>
              ))}
            </ul>
          </ReportCard>

          <div
            className="rounded-xl px-4 py-3"
            style={{ background: "rgba(255,255,255,0.7)" }}
          >
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#94a3b8" }}>
              Unofficial Disclaimer
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: "#64748b" }}>{DISCLAIMER}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReportCard({
  label,
  accent,
  children,
}: {
  label: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "rgba(255,255,255,0.92)",
        boxShadow: "0 2px 8px rgba(15,31,60,0.07)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-full" style={{ background: accent }} />
        <span
          className="text-[9px] font-bold uppercase tracking-widest"
          style={{ color: "#64748b" }}
        >
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function ReportField({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#94a3b8" }}>
        {label}
      </p>
      <p className="text-sm font-bold font-mono" style={{ color: valueColor ?? "#1e293b" }}>
        {value}
      </p>
    </div>
  );
}
