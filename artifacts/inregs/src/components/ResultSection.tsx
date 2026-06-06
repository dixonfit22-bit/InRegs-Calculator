import { useState } from "react";
import { ShieldCheck, TrendingUp, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RegResult } from "@/lib/marineStandards";
import { WATCH_ZONE } from "@/lib/usmcStandards";
import { FormData } from "@/lib/validation";
import { ReportModal } from "./ReportModal";
import { ReadinessPlanner } from "./ReadinessPlanner";
import { SaveProfileButton } from "./ProfileLoader";
import { ProgressTracker } from "./ProgressTracker";

// ── Fonts ─────────────────────────────────────────────────────────────────────

const DISPLAY = '"Rajdhani", "Inter", system-ui, sans-serif';
const BODY    = '"Inter", system-ui, sans-serif';

// ── Digital Camo Pattern ──────────────────────────────────────────────────────

const CAMO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60">
  <rect x="0" y="0" width="10" height="10" fill="#3d5229"/>
  <rect x="10" y="0" width="20" height="10" fill="#5a7040"/>
  <rect x="30" y="0" width="10" height="10" fill="#8a7a5a"/>
  <rect x="40" y="0" width="20" height="10" fill="#3d5229"/>
  <rect x="60" y="0" width="10" height="10" fill="#2f3d1f"/>
  <rect x="70" y="0" width="10" height="10" fill="#5a7040"/>
  <rect x="0" y="10" width="20" height="10" fill="#5a7040"/>
  <rect x="20" y="10" width="10" height="10" fill="#3d5229"/>
  <rect x="30" y="10" width="10" height="10" fill="#8a7a5a"/>
  <rect x="40" y="10" width="20" height="10" fill="#5a7040"/>
  <rect x="60" y="10" width="20" height="10" fill="#2f3d1f"/>
  <rect x="0" y="20" width="10" height="10" fill="#8a7a5a"/>
  <rect x="10" y="20" width="30" height="10" fill="#3d5229"/>
  <rect x="40" y="20" width="10" height="10" fill="#8a7a5a"/>
  <rect x="50" y="20" width="20" height="10" fill="#5a7040"/>
  <rect x="70" y="20" width="10" height="10" fill="#3d5229"/>
  <rect x="0" y="30" width="20" height="10" fill="#3d5229"/>
  <rect x="20" y="30" width="10" height="10" fill="#2f3d1f"/>
  <rect x="30" y="30" width="20" height="10" fill="#8a7a5a"/>
  <rect x="50" y="30" width="20" height="10" fill="#3d5229"/>
  <rect x="70" y="30" width="10" height="10" fill="#5a7040"/>
  <rect x="0" y="40" width="10" height="10" fill="#5a7040"/>
  <rect x="10" y="40" width="20" height="10" fill="#3d5229"/>
  <rect x="30" y="40" width="10" height="10" fill="#5a7040"/>
  <rect x="40" y="40" width="10" height="10" fill="#2f3d1f"/>
  <rect x="50" y="40" width="30" height="10" fill="#8a7a5a"/>
  <rect x="0" y="50" width="10" height="10" fill="#2f3d1f"/>
  <rect x="10" y="50" width="20" height="10" fill="#8a7a5a"/>
  <rect x="30" y="50" width="10" height="10" fill="#3d5229"/>
  <rect x="40" y="50" width="20" height="10" fill="#5a7040"/>
  <rect x="60" y="50" width="10" height="10" fill="#8a7a5a"/>
  <rect x="70" y="50" width="10" height="10" fill="#3d5229"/>
</svg>`;

const CAMO_URL = `url("data:image/svg+xml,${encodeURIComponent(CAMO_SVG)}")`;

// ── Status config ─────────────────────────────────────────────────────────────

type RiskLevel = "In Regs" | "Watch Zone" | "Out of Regs";

const STATUS_CFG: Record<RiskLevel, {
  gradient: string;
  headline: string;
  sub: string;
  badgeBg: string;
  dot: string;
}> = {
  "In Regs": {
    gradient:  "linear-gradient(135deg, #16a34a 0%, #14532d 100%)",
    headline:  "PASSING STANDARDS",
    sub:       "You're good today. Stay there.",
    badgeBg:   "rgba(255,255,255,0.18)",
    dot:       "#4ade80",
  },
  "Watch Zone": {
    gradient:  "linear-gradient(135deg, #d97706 0%, #7c2d12 100%)",
    headline:  "WATCH ZONE",
    sub:       "Stay ready. Maintain your edge.",
    badgeBg:   "rgba(255,255,255,0.18)",
    dot:       "#fbbf24",
  },
  "Out of Regs": {
    gradient:  "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)",
    headline:  "ACTION NEEDED",
    sub:       "Address it. Every week counts.",
    badgeBg:   "rgba(255,255,255,0.18)",
    dot:       "#f87171",
  },
};

// ── Row status helpers ────────────────────────────────────────────────────────

type RowStatus = "pass" | "watch" | "fail";

const ROW_CFG: Record<RowStatus, {
  dot: string; text: string;
  cardBg: string; cardBorder: string; accent: string;
  badge: string; badgeText: string;
}> = {
  pass: {
    dot: "#16a34a", text: "#15803d",
    cardBg: "#f0fdf4", cardBorder: "#bbf7d0", accent: "#16a34a",
    badge: "#dcfce7", badgeText: "#15803d",
  },
  watch: {
    dot: "#d97706", text: "#b45309",
    cardBg: "#fffbeb", cardBorder: "#fde68a", accent: "#d97706",
    badge: "#fef3c7", badgeText: "#92400e",
  },
  fail: {
    dot: "#dc2626", text: "#b91c1c",
    cardBg: "#fff1f2", cardBorder: "#fecaca", accent: "#dc2626",
    badge: "#fee2e2", badgeText: "#991b1b",
  },
};

// ── StatusHero ────────────────────────────────────────────────────────────────

function StatusHero({ riskLevel, passFailStatus, marineName }: {
  riskLevel: RiskLevel;
  passFailStatus: string;
  marineName?: string;
}) {
  const cfg = STATUS_CFG[riskLevel];
  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{ background: cfg.gradient }}
      data-testid="status-banner"
    >
      {/* Camo texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: CAMO_URL, backgroundSize: "80px 60px", opacity: 0.08 }}
      />

      {/* Content */}
      <div className="relative px-6 py-8 flex flex-col gap-1">
        <p
          className="text-white/60 text-[10px] font-bold uppercase tracking-[0.3em]"
          style={{ fontFamily: DISPLAY }}
        >
          MISSION READY
        </p>

        <h1
          className="text-white font-black leading-none"
          style={{ fontFamily: DISPLAY, fontSize: "clamp(2rem, 8vw, 2.75rem)" }}
        >
          {cfg.headline}
        </h1>

        <p
          className="text-white/75 text-sm mt-1 leading-snug"
          style={{ fontFamily: BODY }}
        >
          {cfg.sub}
        </p>

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <span
            className="text-white text-sm font-black px-4 py-1.5 rounded-full tracking-widest"
            style={{ background: cfg.badgeBg }}
          >
            {passFailStatus}
          </span>
          {marineName && (
            <span className="text-white/65 text-xs font-mono">{marineName}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ReadinessSummary ──────────────────────────────────────────────────────────

function ReadinessSummary({ result, pftScore, cftScore }: {
  result: RegResult;
  pftScore: number;
  cftScore: number;
}) {
  type Row = { label: string; status: RowStatus; value: string; detail: string } |
             { label: string; status: null; value: string; detail: string; color: string };

  const rows: Row[] = [];

  // Weight
  const weightGap   = result.maxAllowableWeight - result.currentWeight;
  const weightStatus: RowStatus = result.overWeightLimit ? "fail"
    : weightGap <= WATCH_ZONE.WEIGHT_LBS ? "watch" : "pass";
  const weightValue  = result.overWeightLimit ? `${Math.abs(weightGap)} lbs Over Limit`
    : weightGap === 0 ? "At Limit" : `${weightGap} lbs Below Limit`;
  rows.push({ label: "Weight", status: weightStatus, value: weightValue,
    detail: `${result.currentWeight} lbs / ${result.maxAllowableWeight} lb limit` });

  // Waist
  if (result.whtrMaxWaist !== null) {
    const waistGap    = Math.round((result.whtrMaxWaist - result.waistInches) * 10) / 10;
    const waistStatus: RowStatus = !result.whtrPass ? "fail" : waistGap <= 0.5 ? "watch" : "pass";
    const waistValue  = !result.whtrPass ? `${Math.abs(waistGap)}" Over Limit`
      : waistGap === 0 ? "At Limit" : `${waistGap}" Below Limit`;
    rows.push({ label: "Waist", status: waistStatus, value: waistValue,
      detail: `${result.waistInches}" / ${result.whtrMaxWaist}" max` });
  }

  // Body Fat
  const bfGap    = Math.round((result.effectiveMaxBodyFat - result.estimatedBodyFat) * 10) / 10;
  const bfOver   = result.estimatedBodyFat > result.effectiveMaxBodyFat;
  const bfStatus: RowStatus = bfOver ? "fail"
    : Math.abs(bfGap) <= WATCH_ZONE.BODY_FAT_PCT ? "watch" : "pass";
  const bfValue  = bfOver ? `${Math.abs(bfGap)}% Over Limit`
    : bfGap === 0 ? "At Limit" : `${bfGap}% Below Limit`;
  rows.push({ label: "Body Fat", status: bfStatus, value: bfValue,
    detail: `${result.estimatedBodyFat}% est. / ${result.effectiveMaxBodyFat}% limit` });

  // PFT / CFT
  const pftColor = pftScore >= 225 ? "#16a34a" : pftScore >= 150 ? "#d97706" : "#dc2626";
  const cftColor = cftScore >= 225 ? "#16a34a" : cftScore >= 150 ? "#d97706" : "#dc2626";
  rows.push({ label: "PFT", status: null, value: String(pftScore), detail: "/ 300", color: pftColor });
  rows.push({ label: "CFT", status: null, value: String(cftScore), detail: "/ 300", color: cftColor });

  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
      <div className="px-5 py-3 border-b border-slate-100">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400"
           style={{ fontFamily: DISPLAY }}>
          Readiness Summary
        </p>
      </div>
      <div className="divide-y divide-slate-50">
        {rows.map((row) => {
          const isScore = row.status === null;
          const c = !isScore ? ROW_CFG[row.status as RowStatus] : null;
          return (
            <div key={row.label} className="flex items-center px-5 py-3.5 gap-3.5">
              {/* Colored dot */}
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: isScore ? "#cbd5e1" : c!.dot }}
              />

              {/* Label */}
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 w-20 shrink-0"
                 style={{ fontFamily: DISPLAY }}>
                {row.label}
              </p>

              {/* Value */}
              {isScore ? (
                <p className="flex-1 font-black text-lg font-mono" style={{ color: (row as { color: string }).color }}>
                  {row.value}
                  <span className="text-slate-400 font-normal text-xs ml-1.5">{row.detail}</span>
                </p>
              ) : (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold leading-snug" style={{ color: c!.text, fontFamily: BODY }}>
                    {row.value}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{row.detail}</p>
                </div>
              )}

              {/* Badge */}
              {!isScore && (
                <span
                  className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0"
                  style={{ background: c!.badge, color: c!.badgeText }}
                >
                  {row.status === "pass" ? "PASS" : row.status === "watch" ? "WATCH" : "FAIL"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Your Game Plan ────────────────────────────────────────────────────────────

interface PlanItem {
  status: RowStatus;
  action: string;
  micro: string;
}

function GamePlan({ result }: { result: RegResult }) {
  const items: PlanItem[] = [];

  // Weight
  const weightGap = result.maxAllowableWeight - result.currentWeight;
  if (result.overWeightLimit) {
    items.push({ status: "fail",
      action: `Lose ${Math.abs(weightGap)} lbs to meet the height/weight standard.`,
      micro:  `${result.currentWeight} lbs now — limit is ${result.maxAllowableWeight} lbs.` });
  } else if (weightGap <= WATCH_ZONE.WEIGHT_LBS) {
    items.push({ status: "watch",
      action: `You have ${weightGap} lb${weightGap !== 1 ? "s" : ""} before hitting your weight limit.`,
      micro:  "Keep the weight under control." });
  } else {
    items.push({ status: "pass",
      action: `Maintain current weight — ${weightGap} lbs below your limit.`,
      micro:  "Maintain your edge." });
  }

  // Waist
  if (result.whtrMaxWaist !== null) {
    const waistGap = Math.round((result.whtrMaxWaist - result.waistInches) * 10) / 10;
    if (!result.whtrPass) {
      items.push({ status: "fail",
        action: `Reduce waist by ${Math.abs(waistGap)}" to pass the waist-to-height check.`,
        micro:  `${result.waistInches}" now — max allowed is ${result.whtrMaxWaist}".` });
    } else if (waistGap <= 0.5) {
      items.push({ status: "watch",
        action: `Keep waist below ${result.whtrMaxWaist}" — only ${waistGap}" of margin.`,
        micro:  "Keep the waist under control." });
    } else {
      items.push({ status: "pass",
        action: `Waist is ${waistGap}" clear of the limit.`,
        micro:  "Stay ready." });
    }
  }

  // Body Fat
  const bfGap  = Math.round((result.effectiveMaxBodyFat - result.estimatedBodyFat) * 10) / 10;
  const bfOver = result.estimatedBodyFat > result.effectiveMaxBodyFat;
  if (bfOver) {
    items.push({ status: "fail",
      action: `Estimated body fat is ${Math.abs(bfGap)}% over the limit.`,
      micro:  "Reduce through consistent diet and exercise." });
  } else if (bfGap <= WATCH_ZONE.BODY_FAT_PCT) {
    items.push({ status: "watch",
      action: `You have ${bfGap}% body fat before reaching your limit.`,
      micro:  "Discipline now prevents problems later." });
  } else {
    items.push({ status: "pass",
      action: `Body fat is ${bfGap}% clear of your limit.`,
      micro:  "You're good today. Stay there." });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 px-1"
         style={{ fontFamily: DISPLAY }}>
        Your Game Plan
      </p>
      {items.map((item, i) => {
        const c = ROW_CFG[item.status];
        return (
          <div
            key={i}
            className="flex gap-0 rounded-2xl overflow-hidden"
            style={{
              background: c.cardBg,
              border: `1px solid ${c.cardBorder}`,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            {/* Left accent stripe */}
            <div className="w-1 shrink-0" style={{ background: c.accent }} />
            <div className="px-4 py-4 flex-1">
              <p className="text-sm font-semibold text-slate-800 leading-snug" style={{ fontFamily: BODY }}>
                {item.action}
              </p>
              <p className="text-xs mt-1 italic" style={{ color: c.text, fontFamily: BODY }}>
                {item.micro}
              </p>
            </div>
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
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white"
         style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500"
           style={{ fontFamily: DISPLAY }}>
          Show Regulation Details
        </p>
        {open
          ? <ChevronUp className="w-4 h-4 text-slate-400" />
          : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="px-5 py-5 flex flex-col gap-5 border-t border-slate-100">

          {/* Narrative */}
          <p className="text-sm leading-relaxed text-slate-600" style={{ fontFamily: BODY }}>
            {result.message}
          </p>

          {/* WHtR detail */}
          {result.whtrMaxWaist !== null && (
            <div className="rounded-xl border border-slate-100 px-4 py-3 bg-slate-50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2"
                 style={{ fontFamily: DISPLAY }}>
                Waist Check (WHtR)
              </p>
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-black font-mono"
                   style={{ color: result.whtrPass ? "#16a34a" : "#dc2626" }}>
                  {result.whtrRatio.toFixed(3)}
                </p>
                <div>
                  <p className="text-xs text-slate-500">Standard: &lt; 0.52</p>
                  <p className="text-xs text-slate-500">Max waist {result.whtrMaxWaist}" at your height</p>
                </div>
              </div>
            </div>
          )}

          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Body Weight",
                value: `${result.currentWeight}`,
                unit: "lbs",
                limit: `limit ${result.maxAllowableWeight} lbs`,
                over: result.overWeightLimit,
              },
              {
                label: "Body Fat",
                value: `${result.estimatedBodyFat}`,
                unit: "%",
                limit: `limit ${result.effectiveMaxBodyFat}%`,
                over: result.estimatedBodyFat > result.effectiveMaxBodyFat,
              },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-slate-100 px-3 py-3 bg-slate-50 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1"
                   style={{ fontFamily: DISPLAY }}>{m.label}</p>
                <p className="text-2xl font-black font-mono"
                   style={{ color: m.over ? "#dc2626" : "#16a34a" }}>
                  {m.value}<span className="text-sm font-normal text-slate-400 ml-0.5">{m.unit}</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{m.limit}</p>
              </div>
            ))}
          </div>

          {/* Performance banners */}
          {result.performanceExempt && (
            <div className="border border-green-200 bg-green-50 p-3 rounded-xl flex items-start gap-2"
                 data-testid="performance-exempt-banner">
              <ShieldCheck className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <p className="text-xs text-green-700 leading-snug" style={{ fontFamily: BODY }}>
                High-Performance BF Cap (MARADMIN 066/26): Both PFT &amp; CFT ≥ {result.bestFitnessScore} — BF limit raised from {result.maxBodyFat}% to {result.effectiveMaxBodyFat}%.
              </p>
            </div>
          )}
          {result.performanceAllowance && (
            <div className="border border-green-200 bg-green-50 p-3 rounded-xl flex items-start gap-2"
                 data-testid="performance-allowance-banner">
              <TrendingUp className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <p className="text-xs text-green-700 leading-snug" style={{ fontFamily: BODY }}>
                Performance Allowance (MARADMIN 066/26): Both PFT &amp; CFT ≥ {result.bestFitnessScore} — +1% BF applied, effective limit {result.effectiveMaxBodyFat}%.
              </p>
            </div>
          )}

          {/* BIA / tape note */}
          <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-100 pt-3"
             style={{ fontFamily: BODY }}>
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
    <div
      className="flex flex-col gap-5 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{ background: "linear-gradient(160deg, #ffffff 0%, #f4f8f0 55%, #eef4e7 100%)" }}
    >
      {/* 1 — Large status hero with camo */}
      <StatusHero
        riskLevel={result.riskLevel as RiskLevel}
        passFailStatus={result.passFailStatus}
        marineName={marineName}
      />

      {/* 2 — Readiness summary */}
      <ReadinessSummary result={result} pftScore={pftScore} cftScore={cftScore} />

      {/* 3 — Your Game Plan */}
      <GamePlan result={result} />

      {/* 4 — Regulation details (collapsed by default) */}
      <RegulationDetails result={result} />

      {/* 5 — Mission Planner */}
      <ReadinessPlanner result={result} inputs={inputs} />

      {/* 6 — Progress Tracker (saved profiles only) */}
      {activeProfileId && (
        <ProgressTracker
          profileId={activeProfileId}
          currentWeight={result.currentWeight}
          maxAllowableWeight={result.maxAllowableWeight}
        />
      )}

      {/* 7 — Save profile */}
      <SaveProfileButton
        result={result}
        inputs={inputs}
        activeProfileId={activeProfileId}
        onSaved={onProfileSaved}
      />

      {/* 8 — Generate Report */}
      <button
        type="button"
        onClick={() => setReportOpen(true)}
        data-testid="button-generate-report"
        className="w-full h-12 rounded-xl font-black text-sm uppercase tracking-widest text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:opacity-80"
        style={{
          background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
          boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
          fontFamily: DISPLAY,
        }}
      >
        <FileText className="w-4 h-4" />
        Generate Report
      </button>

      {/* 9 — New Assessment */}
      <button
        type="button"
        onClick={onReset}
        data-testid="button-reset"
        className="w-full h-11 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        style={{ fontFamily: BODY }}
      >
        ← New Assessment
      </button>

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
