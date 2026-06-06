import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, Zap, XCircle,
  TrendingDown, TrendingUp, Minus, Pencil, Trash2,
} from "lucide-react";
import { MarineProfile, AssessmentHistoryEntry, computeTrend } from "@/lib/storage";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

/** Net BF% change from `days` ago to latest. Returns null if insufficient data. */
function bfChangeOver(history: AssessmentHistoryEntry[], days: number): number | null {
  if (history.length < 2) return null;
  const sorted = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const latest   = sorted.at(-1)!;
  const cutoff   = new Date(new Date(latest.date).getTime() - days * 24 * 60 * 60 * 1000);
  const baseline = sorted.slice(0, -1).reverse().find((e) => new Date(e.date) <= cutoff);
  if (!baseline) return null;
  return latest.estimatedBodyFat - baseline.estimatedBodyFat;
}

// ── Status Pill ───────────────────────────────────────────────────────────────

function StatusPill({ risk, pass }: { risk: string; pass: boolean }) {
  if (!pass) {
    return (
      <div className="flex items-center gap-2">
        <XCircle className="w-4 h-4 text-destructive" />
        <span className="text-sm font-mono font-bold text-destructive">BF Failure</span>
      </div>
    );
  }
  if (risk === "Watch Zone") {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-mono font-bold text-primary">Passing</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-mono font-bold text-yellow-600">Watch Zone</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className="w-4 h-4 text-primary" />
      <span className="text-sm font-mono font-bold text-primary">Passing — In Regs</span>
    </div>
  );
}

// ── Trend Badge ───────────────────────────────────────────────────────────────

function TrendBadge({ trend }: { trend: "Improving" | "Worsening" | "Stable" }) {
  const cfg = {
    Improving: { icon: <TrendingDown className="w-3 h-3" />, color: "text-primary bg-primary/10",           label: "Improving ↓" },
    Worsening: { icon: <TrendingUp   className="w-3 h-3" />, color: "text-destructive bg-destructive/10",   label: "Worsening ↑" },
    Stable:    { icon: <Minus        className="w-3 h-3" />, color: "text-muted-foreground bg-muted",        label: "Stable →"    },
  }[trend];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

// ── Field Row ─────────────────────────────────────────────────────────────────

function FieldRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-baseline py-2 border-b border-border/50 last:border-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`text-sm font-mono font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function FlagRow({ label, value, flagWhen }: { label: string; value: boolean; flagWhen: boolean }) {
  const flag = value === flagWhen;
  return (
    <div className="flex justify-between items-baseline py-2 border-b border-border/50 last:border-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`text-sm font-mono font-bold ${flag ? "text-yellow-600" : "text-foreground"}`}>
        {value ? "Yes" : "No"}
      </p>
    </div>
  );
}

// ── BF Trend Over Time ────────────────────────────────────────────────────────

function BFTrendPanel({ history }: { history: AssessmentHistoryEntry[] }) {
  const change30 = bfChangeOver(history, 30);
  const change60 = bfChangeOver(history, 60);
  const change90 = bfChangeOver(history, 90);

  if (change30 === null && change60 === null && change90 === null) return null;

  function Delta({ days, value }: { days: number; value: number | null }) {
    if (value === null) return (
      <div className="flex flex-col items-center gap-0.5">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{days}d</p>
        <p className="text-sm font-mono font-bold text-muted-foreground/40">—</p>
      </div>
    );
    const color = value < 0 ? "text-primary" : value > 0 ? "text-destructive" : "text-muted-foreground";
    const sign  = value < 0 ? "−" : value > 0 ? "+" : "";
    return (
      <div className="flex flex-col items-center gap-0.5">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{days}d</p>
        <p className={`text-sm font-mono font-bold ${color}`}>
          {sign}{Math.abs(value).toFixed(1)}%
        </p>
        <p className={`text-[9px] ${color}`}>
          {value < 0 ? "↓ down" : value > 0 ? "↑ up" : "stable"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
        BF% Change Over Time
      </p>
      <div className="border border-border rounded-md px-4 py-3 flex justify-around gap-2 bg-muted/20">
        <Delta days={30} value={change30} />
        <div className="w-px bg-border" />
        <Delta days={60} value={change60} />
        <div className="w-px bg-border" />
        <Delta days={90} value={change90} />
      </div>
      <p className="text-[9px] text-muted-foreground mt-1.5 text-center">
        Net BF% change from baseline to most recent assessment
      </p>
    </div>
  );
}

// ── History Table ─────────────────────────────────────────────────────────────

function HistoryTable({ history }: { history: AssessmentHistoryEntry[] }) {
  if (history.length === 0) return null;
  const sorted = [...history].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return (
    <div className="space-y-2">
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        Assessment History ({history.length})
      </p>
      <div className="border border-border rounded-md overflow-hidden">
        <div className="grid grid-cols-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-2 bg-muted/30">
          <span>Date</span>
          <span className="text-center">Weight</span>
          <span className="text-right">BF%</span>
        </div>
        <div className="flex flex-col divide-y divide-border">
          {sorted.map((e, i) => {
            const prev    = sorted[i + 1];
            const bfDelta = prev ? e.estimatedBodyFat - prev.estimatedBodyFat : null;
            return (
              <div key={e.id} className="grid grid-cols-3 items-center px-3 py-2">
                <p className="text-[11px] font-mono text-foreground">{fmtDate(e.date)}</p>
                <p className="text-[11px] font-mono text-foreground text-center">{e.weight} lbs</p>
                <div className="text-right">
                  <p className="text-[11px] font-mono font-bold text-foreground">{e.estimatedBodyFat}%</p>
                  {bfDelta !== null && (
                    <p className={`text-[9px] font-mono ${bfDelta < 0 ? "text-primary" : bfDelta > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {bfDelta < 0 ? `−${Math.abs(bfDelta).toFixed(1)}` : bfDelta > 0 ? `+${bfDelta.toFixed(1)}` : "—"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  profile: MarineProfile | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: (profile: MarineProfile) => void;
}

export function MarineDetailDrawer({ profile, onClose, onDelete, onEdit }: Props) {
  const open  = !!profile;
  const trend = profile ? computeTrend(profile) : null;

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DrawerContent className="max-h-[88dvh] flex flex-col">
        {profile && (
          <>
            {/* Sticky header */}
            <DrawerHeader className="text-left pb-2 shrink-0">
              <DrawerTitle className="font-mono text-base font-bold uppercase tracking-widest text-foreground">
                {profile.name}
              </DrawerTitle>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <p className="text-[10px] text-muted-foreground">Updated {fmtDate(profile.updatedAt)}</p>
                {trend && <TrendBadge trend={trend} />}
              </div>
            </DrawerHeader>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 pb-2 flex flex-col gap-4">
              {/* Body Composition — most important first */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Body Composition
                </p>
                <FieldRow label="Body Fat"    value={`${profile.estimatedBodyFat}%`} accent={profile.estimatedBodyFat <= profile.effectiveMaxBodyFat} />
                <FieldRow label="Max Allowed" value={`${profile.effectiveMaxBodyFat}%`} />
                <FieldRow
                  label="BF Buffer"
                  value={
                    profile.effectiveMaxBodyFat - profile.estimatedBodyFat >= 0
                      ? `${(profile.effectiveMaxBodyFat - profile.estimatedBodyFat).toFixed(1)}% under limit`
                      : `${(profile.estimatedBodyFat - profile.effectiveMaxBodyFat).toFixed(1)}% over limit`
                  }
                />
                <div className="flex justify-between items-start py-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</p>
                  <StatusPill risk={profile.riskLevel} pass={profile.passFailStatus === "PASS"} />
                </div>
              </div>

              {/* BF trend panel */}
              <BFTrendPanel history={profile.assessmentHistory} />

              {/* Measurements */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Measurements
                </p>
                <FieldRow label="Height" value={`${profile.heightInches}"`} />
                <FieldRow label="Weight" value={`${profile.weightLbs} lbs`} />
                <FieldRow label="Neck"   value={`${profile.neckInches}"`} />
                <FieldRow label="Waist"  value={`${profile.waistInches}"`} />
                {profile.hipInches && (
                  <FieldRow label="Hip" value={`${profile.hipInches}"`} />
                )}
              </div>

              {/* Administrative flags */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Administrative
                </p>
                <FlagRow label="Over H/W Table" value={profile.overWeightLimit} flagWhen={true} />
                <FlagRow label="Tape Required"  value={profile.tapeRequired}    flagWhen={true} />
              </div>

              {/* Assessment history */}
              <HistoryTable history={profile.assessmentHistory} />
            </div>

            {/* Sticky footer — always visible */}
            <DrawerFooter className="pt-2 shrink-0 border-t border-border bg-background">
              <Button
                type="button"
                className="w-full h-11 uppercase tracking-widest text-xs font-bold gap-2"
                onClick={() => { onEdit(profile); onClose(); }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit in Calculator
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 uppercase tracking-widest text-xs font-bold gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(profile.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Marine
              </Button>
              <DrawerClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-10 uppercase tracking-widest text-xs text-muted-foreground"
                >
                  Close
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
