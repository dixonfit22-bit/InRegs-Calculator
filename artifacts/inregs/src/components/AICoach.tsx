import { useState, useRef } from "react";
import {
  Sparkles, ChevronDown, ChevronUp, Dumbbell, Utensils,
  Loader2, AlertCircle, RefreshCw, ShieldAlert, ArrowLeft,
} from "lucide-react";
import { RegResult } from "@/lib/marineStandards";
import { FormData } from "@/lib/validation";

interface AICoachProps { result: RegResult; inputs: FormData; }

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorkoutSession { day: string; type: string; details: string; }
interface WorkoutWeek   { label: string; sessions: WorkoutSession[]; }
interface SampleMeal    { meal: string; description: string; calories: number; }

interface CoachResponse {
  mode: "fullPlan" | "quickPick" | "workoutOnly" | "refusal";
  hardRefusal?: string;
  safetyWarning?: string;
  calorieAtSafeMinimum?: boolean;
  summary?: string;
  bullets?: string[];
  safetyNote?: string;
  // nutrition
  dailyCalories?: number; proteinG?: number; carbsG?: number;
  fatG?: number; hydrationOz?: number; weeklyWeightLossLbs?: number;
  mealStructure?: string; sampleDay?: SampleMeal[];
  chowHallOptions?: string[]; fieldOptions?: string[];
  coachingTips?: string[];
  workoutPlan?: { goal: string; daysPerWeek: number; weeks: WorkoutWeek[] };
  // workout-only
  keyTips?: string[];
  weeks?: WorkoutWeek[];
}

// ── Form types ────────────────────────────────────────────────────────────────

interface NutritionForm {
  goal: string; activityLevel: string; trainingFrequency: string;
  dietaryRestrictions: string; targetTimeline: string;
}
interface WorkoutForm {
  workoutGoal: string; fitnessLevel: string; equipment: string;
  trainingDays: string; injuries: string;
}

const DEFAULT_NUT: NutritionForm = { goal: "", activityLevel: "", trainingFrequency: "", dietaryRestrictions: "", targetTimeline: "" };
const DEFAULT_WKT: WorkoutForm   = { workoutGoal: "", fitnessLevel: "", equipment: "", trainingDays: "", injuries: "" };

// ── Quick picks ───────────────────────────────────────────────────────────────

const NUTRITION_PICKS = [
  { id: "safe-meal-plan",          label: "Build Me a Safe Meal Plan",         icon: "🥗", mode: "form"  },
  { id: "lose-weight-performance", label: "Lose Weight & Keep Performance",    icon: "📉", mode: "form"  },
  { id: "pre-pft-nutrition",       label: "What to Eat Before a PFT",         icon: "🏃", mode: "quick" },
  { id: "post-training-nutrition", label: "What to Eat After Training",        icon: "💪", mode: "quick" },
  { id: "chow-hall-options",       label: "Best Chow Hall Options",            icon: "🍽️", mode: "quick" },
  { id: "field-options",           label: "Field-Friendly Options",            icon: "🪖", mode: "quick" },
  { id: "explain-risk",            label: "Explain My Body Comp Risk",         icon: "📊", mode: "quick" },
  { id: "grocery-list",            label: "Weekly Grocery List",               icon: "🛒", mode: "quick" },
] as const;

const WORKOUT_PICKS = [
  { id: "pft-prep",       label: "Build a PFT Prep Plan",          icon: "🏅", mode: "form"  },
  { id: "cft-prep",       label: "Build a CFT Prep Plan",          icon: "⚔️", mode: "form"  },
  { id: "improve-run",    label: "Improve My Run Time",            icon: "⏱️", mode: "quick" },
  { id: "full-body",      label: "Full Body Strength",             icon: "💪", mode: "quick" },
  { id: "field-workouts", label: "Field Workouts (No Gear)",       icon: "🪖", mode: "quick" },
  { id: "recovery",       label: "Recovery & Mobility",            icon: "🧘", mode: "quick" },
] as const;

type NutPickId = typeof NUTRITION_PICKS[number]["id"];
type WktPickId = typeof WORKOUT_PICKS[number]["id"];
type Tab = "nutrition" | "workout";
type View = "home" | "nutForm" | "wktForm" | "loading" | "done" | "error";

// ── Helpers ───────────────────────────────────────────────────────────────────

const FONT = '"Rajdhani", "JetBrains Mono", monospace';

function parseStreamedJSON(raw: string): CoachResponse | null {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return JSON.parse(m[0]) as CoachResponse;
  } catch { return null; }
}

function workoutTypeStyle(type: string) {
  const t = type.toLowerCase();
  if (t.includes("run") || t.includes("cardio")) return { bg: "#eff6ff", color: "#2563eb" };
  if (t.includes("strength"))                     return { bg: "#f0fdf4", color: "#16a34a" };
  if (t.includes("rest") || t.includes("recov"))  return { bg: "#f8fafc", color: "#94a3b8" };
  return                                                  { bg: "#fefce8", color: "#d97706" };
}

// ── Shared UI atoms ───────────────────────────────────────────────────────────

function MacroPill({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
      <span className="text-lg font-bold font-mono leading-none" style={{ color }}>{value}{unit}</span>
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 text-center">{label}</span>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 12px rgba(15,31,60,0.08)" }}>
      {children}
    </div>
  );
}

function SectionHeader({
  icon, label, accent, open, onToggle,
}: { icon: React.ReactNode; label: string; accent: string; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50/60 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: accent }}>
          {icon}
        </div>
        <span className="text-sm font-bold text-slate-800 uppercase tracking-wider" style={{ fontFamily: FONT }}>{label}</span>
      </div>
      {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
    </button>
  );
}

function CollapsibleSection({ icon, label, accent, children, defaultOpen = true }: {
  icon: React.ReactNode; label: string; accent: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <SectionHeader icon={icon} label={label} accent={accent} open={open} onToggle={() => setOpen(o => !o)} />
      {open && <div style={{ borderTop: "1px solid #e2e8f0" }}>{children}</div>}
    </Card>
  );
}

function SelectField({ label, value, onChange, options, optional }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; optional?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {label}{optional && <span className="text-slate-400 normal-case font-normal ml-1">(optional)</span>}
      </span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-400">
        <option value="">Select…</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, optional }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; optional?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {label}{optional && <span className="text-slate-400 normal-case font-normal ml-1">(optional)</span>}
      </span>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 font-mono placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400" />
    </div>
  );
}

function GenerateButton({ onClick, disabled, loading, label = "Generate My Plan" }: {
  onClick: () => void; disabled: boolean; loading: boolean; label?: string;
}) {
  const active = !disabled && !loading;
  return (
    <button type="button" onClick={onClick} disabled={disabled || loading}
      className="w-full h-12 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
      style={{
        background: active ? "linear-gradient(135deg,#fbbf24,#f59e0b)" : "#e2e8f0",
        color: active ? "#1a1a1a" : "#94a3b8",
        boxShadow: active ? "0 4px 16px rgba(251,191,36,0.3)" : "none",
        fontFamily: FONT, fontSize: "0.95rem", letterSpacing: "0.1em",
      }}>
      {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> {label}</>}
    </button>
  );
}

// ── Tab switcher ──────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex rounded-2xl p-1 gap-1"
      style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 8px rgba(15,31,60,0.07)" }}>
      {([
        { id: "nutrition" as Tab, label: "Nutrition", icon: <Utensils className="w-3.5 h-3.5" /> },
        { id: "workout"   as Tab, label: "Workout",   icon: <Dumbbell  className="w-3.5 h-3.5" /> },
      ] as const).map(t => (
        <button key={t.id} type="button" onClick={() => onChange(t.id)}
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          style={t.id === active
            ? { background: "linear-gradient(135deg,#0d1f3c,#1a3a6e)", color: "#fff", boxShadow: "0 2px 8px rgba(13,31,60,0.2)" }
            : { background: "transparent", color: "#94a3b8" }}>
          {t.icon}{t.label}
        </button>
      ))}
    </div>
  );
}

// ── Header card (dark navy, shown on home) ────────────────────────────────────

function CoachHeader({ tab }: { tab: Tab }) {
  const isWkt = tab === "workout";
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "linear-gradient(135deg,#0d1f3c 0%,#1a3a6e 60%,#1e5799 100%)", boxShadow: "0 4px 24px rgba(13,31,60,0.22)" }}>
      <div className="px-5 py-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
            {isWkt ? <Dumbbell className="w-4 h-4 text-yellow-300" /> : <Sparkles className="w-4 h-4 text-yellow-300" />}
          </div>
          <div>
            <p className="text-white font-bold text-sm" style={{ fontFamily: FONT, letterSpacing: "0.05em" }}>
              {isWkt ? "WORKOUT COACH" : "NUTRITION COACH"}
            </p>
            <p className="text-[10px]" style={{ color: "rgba(150,190,255,0.7)" }}>Powered by GPT-4o</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "rgba(200,225,255,0.9)" }}>
          {isWkt
            ? "Get a personalised PT program built around your BCP status and fitness goals — PFT prep, CFT prep, or general strength."
            : "Get personalised nutrition guidance tailored to your BCP data. Choose a quick question or build a full 4-week nutrition plan."}
        </p>
      </div>
      <div className="px-4 py-3 flex gap-2" style={{ background: "rgba(0,0,0,0.2)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,220,130,0.85)" }}>
          <strong>Educational guidance only — not medical advice.</strong> For injuries, medical conditions, or clinical concerns, consult a qualified professional.
        </p>
      </div>
    </div>
  );
}

// ── Workout sessions display ──────────────────────────────────────────────────

function WorkoutWeeks({ weeks }: { weeks: WorkoutWeek[] }) {
  const [activeWeek, setActiveWeek] = useState(0);
  if (!weeks || weeks.length === 0) return null;
  return (
    <div className="px-4 pb-4 pt-3 flex flex-col gap-4">
      <div className="flex gap-1.5">
        {weeks.map((w, i) => (
          <button key={i} onClick={() => setActiveWeek(i)}
            className="shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
            style={i === activeWeek
              ? { background: "#2563eb", color: "#fff" }
              : { background: "#f1f5f9", color: "#64748b" }}>
            {w.label.split(":")[0].replace("Week ", "Wk ")}
          </button>
        ))}
      </div>
      {weeks[activeWeek] && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{weeks[activeWeek].label}</p>
          {weeks[activeWeek].sessions.map((s, i) => {
            const style = workoutTypeStyle(s.type);
            return (
              <div key={i} className="flex flex-col gap-1 px-3 py-2.5 rounded-xl" style={{ background: "#f8fafc" }}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 w-8 shrink-0">{s.day}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: style.bg, color: style.color }}>{s.type}</span>
                </div>
                <p className="text-sm text-slate-700 leading-snug pl-10">{s.details}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Nutrition results ─────────────────────────────────────────────────────────

function NutritionResults({ data }: { data: CoachResponse }) {
  return (
    <CollapsibleSection icon={<Utensils className="w-4 h-4 text-white" />} label="Nutrition Plan"
      accent="linear-gradient(135deg,#16a34a,#15803d)">
      <div className="px-4 pb-4 pt-3 flex flex-col gap-4">
        <div className="rounded-xl p-3 flex items-center gap-1" style={{ background: "#f0fdf4" }}>
          <MacroPill label="Calories"  value={data.dailyCalories!} unit=""   color="#16a34a" />
          <div className="w-px h-8 bg-green-200 shrink-0" />
          <MacroPill label="Protein"   value={data.proteinG!}      unit="g"  color="#2563eb" />
          <div className="w-px h-8 bg-green-200 shrink-0" />
          <MacroPill label="Carbs"     value={data.carbsG!}        unit="g"  color="#d97706" />
          <div className="w-px h-8 bg-green-200 shrink-0" />
          <MacroPill label="Fat"       value={data.fatG!}          unit="g"  color="#7c3aed" />
          <div className="w-px h-8 bg-green-200 shrink-0" />
          <MacroPill label="Water"     value={data.hydrationOz!}   unit="oz" color="#0891b2" />
        </div>

        {data.weeklyWeightLossLbs != null && (
          <p className="text-xs text-slate-500">Target rate: <strong className="text-slate-700">{data.weeklyWeightLossLbs} lb/week</strong></p>
        )}
        {data.mealStructure && <p className="text-xs text-slate-600 leading-relaxed">{data.mealStructure}</p>}

        {data.sampleDay && data.sampleDay.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sample Day of Eating</p>
            {data.sampleDay.map((m) => (
              <div key={m.meal} className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl" style={{ background: "#f8fafc" }}>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{m.meal}</span>
                  <span className="text-sm text-slate-700 leading-snug">{m.description}</span>
                </div>
                <span className="text-sm font-bold font-mono text-green-700 shrink-0">{m.calories} cal</span>
              </div>
            ))}
          </div>
        )}

        {data.chowHallOptions && data.chowHallOptions.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">🍽️ Chow Hall Options</p>
            <ul className="flex flex-col gap-1.5">
              {data.chowHallOptions.map((o, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700 leading-snug">
                  <span className="text-green-500 shrink-0">•</span>{o}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.fieldOptions && data.fieldOptions.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">🪖 Field / Convenience Options</p>
            <ul className="flex flex-col gap-1.5">
              {data.fieldOptions.map((o, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700 leading-snug">
                  <span className="text-amber-500 shrink-0">•</span>{o}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}

// ── Workout plan (embedded in full plan) ──────────────────────────────────────

function WorkoutPlanSection({ plan }: { plan: NonNullable<CoachResponse["workoutPlan"]> }) {
  return (
    <CollapsibleSection icon={<Dumbbell className="w-4 h-4 text-white" />} label="4-Week Workout Plan"
      accent="linear-gradient(135deg,#2563eb,#1d4ed8)">
      <div className="px-4 pb-1 pt-2">
        <p className="text-xs text-slate-500 pb-2">{plan.goal}</p>
      </div>
      <WorkoutWeeks weeks={plan.weeks} />
    </CollapsibleSection>
  );
}

// ── Forms ─────────────────────────────────────────────────────────────────────

function NutritionForm({ form, onChange, onSubmit, onBack }: {
  form: NutritionForm; onChange: (k: keyof NutritionForm, v: string) => void;
  onSubmit: () => void; onBack: () => void;
}) {
  const canSubmit = form.goal && form.activityLevel && form.trainingFrequency && form.targetTimeline;
  return (
    <Card>
      <div className="px-4 py-3.5 flex items-center gap-3" style={{ borderBottom: "1px solid #e2e8f0" }}>
        <button type="button" onClick={onBack}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-slate-800 uppercase tracking-wider" style={{ fontFamily: FONT }}>
          Nutrition Plan Details
        </span>
      </div>
      <div className="px-4 py-4 flex flex-col gap-3">
        <SelectField label="Primary Goal" value={form.goal} onChange={v => onChange("goal", v)}
          options={[
            { value: "lose fat, stay in regs",                          label: "Lose Fat / Stay In Regs" },
            { value: "lose fat while maintaining PFT/CFT performance",  label: "Lose Fat + Keep Performance" },
            { value: "maintain current weight and body composition",    label: "Maintain Current Status" },
            { value: "gain muscle while minimizing fat gain",           label: "Gain Muscle" },
            { value: "improve PFT/CFT performance",                     label: "Improve PFT / CFT Score" },
          ]} />
        <SelectField label="Activity Level" value={form.activityLevel} onChange={v => onChange("activityLevel", v)}
          options={[
            { value: "sedentary — desk job, minimal movement",   label: "Sedentary (desk job)" },
            { value: "lightly active — light duty, on feet",     label: "Lightly Active (light duty)" },
            { value: "moderately active — regular PT, walking",  label: "Moderately Active (regular PT)" },
            { value: "very active — daily training, field ops",  label: "Very Active (daily training / field)" },
          ]} />
        <SelectField label="Training Frequency" value={form.trainingFrequency} onChange={v => onChange("trainingFrequency", v)}
          options={["2","3","4","5","6"].map(n => ({ value: n, label: `${n} days/week` }))} />
        <SelectField label="Target Timeline" value={form.targetTimeline} onChange={v => onChange("targetTimeline", v)}
          options={[
            { value: "4 weeks (upcoming weigh-in)", label: "4 Weeks (upcoming weigh-in)" },
            { value: "8 weeks",                     label: "8 Weeks" },
            { value: "12 weeks",                    label: "12 Weeks" },
            { value: "ongoing / long-term",         label: "Ongoing / Long-Term" },
          ]} />
        <TextField label="Dietary Restrictions / Preferences" value={form.dietaryRestrictions}
          onChange={v => onChange("dietaryRestrictions", v)}
          placeholder="e.g. no pork, lactose intolerant, high-volume eater…" optional />
        <GenerateButton onClick={onSubmit} disabled={!canSubmit} loading={false} />
      </div>
    </Card>
  );
}

function WorkoutFormCard({ form, onChange, onSubmit, onBack }: {
  form: WorkoutForm; onChange: (k: keyof WorkoutForm, v: string) => void;
  onSubmit: () => void; onBack: () => void;
}) {
  const canSubmit = form.workoutGoal && form.fitnessLevel && form.equipment && form.trainingDays;
  return (
    <Card>
      <div className="px-4 py-3.5 flex items-center gap-3" style={{ borderBottom: "1px solid #e2e8f0" }}>
        <button type="button" onClick={onBack}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-slate-800 uppercase tracking-wider" style={{ fontFamily: FONT }}>
          Workout Plan Details
        </span>
      </div>
      <div className="px-4 py-4 flex flex-col gap-3">
        <SelectField label="Training Goal" value={form.workoutGoal} onChange={v => onChange("workoutGoal", v)}
          options={[
            { value: "improve PFT overall score",              label: "Improve PFT Score" },
            { value: "improve PFT 3-mile run time",            label: "Improve Run Time" },
            { value: "improve pull-ups and push-ups",          label: "Improve Pull-ups / Push-ups" },
            { value: "improve CFT score",                      label: "Improve CFT Score" },
            { value: "general fitness and BCP body comp",      label: "General Fitness + BCP Support" },
            { value: "build strength while losing body fat",   label: "Strength + Fat Loss" },
          ]} />
        <SelectField label="Current Fitness Level" value={form.fitnessLevel} onChange={v => onChange("fitnessLevel", v)}
          options={[
            { value: "beginner — haven't trained consistently in 2+ months", label: "Beginner (hasn't trained consistently)" },
            { value: "intermediate — training 2-3x/week regularly",          label: "Intermediate (2-3x/week)" },
            { value: "advanced — training 4-5x/week, strong base",           label: "Advanced (4-5x/week)" },
          ]} />
        <SelectField label="Equipment Available" value={form.equipment} onChange={v => onChange("equipment", v)}
          options={[
            { value: "bodyweight only — no equipment",              label: "Bodyweight Only" },
            { value: "limited — pull-up bar, bands, dumbbells",     label: "Limited (pull-up bar + dumbbells)" },
            { value: "full gym — barbells, machines, cardio gear",  label: "Full Gym Access" },
          ]} />
        <SelectField label="Training Days Per Week" value={form.trainingDays} onChange={v => onChange("trainingDays", v)}
          options={["3","4","5","6"].map(n => ({ value: n, label: `${n} days/week` }))} />
        <TextField label="Injuries or Limitations" value={form.injuries}
          onChange={v => onChange("injuries", v)}
          placeholder="e.g. bad knees, lower back pain, shin splints…" optional />
        <GenerateButton onClick={onSubmit} disabled={!canSubmit} loading={false} label="Generate Workout Plan" />
      </div>
    </Card>
  );
}

// ── Loading view ──────────────────────────────────────────────────────────────

function LoadingView({ rawLen, tab }: { rawLen: number; tab: Tab }) {
  const progress = Math.min(92, Math.round((rawLen / 2500) * 100));
  const isWkt = tab === "workout";
  const statusText =
    rawLen < 80   ? "Analyzing your BCP data…"
    : rawLen < 400  ? (isWkt ? "Designing your training program…" : "Calculating calorie targets…")
    : rawLen < 1200 ? (isWkt ? "Building your weekly sessions…"  : "Building your meal plan…")
    :                  "Finalizing your plan…";
  return (
    <Card>
      <div className="px-5 py-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-slate-800" style={{ fontFamily: FONT }}>Building Your Plan…</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">GPT-4o is working</p>
          </div>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg,#2563eb,#7c3aed)" }} />
        </div>
        <p className="text-[11px] text-slate-400 italic">{statusText}</p>
      </div>
    </Card>
  );
}

// ── Result header bar ─────────────────────────────────────────────────────────

function ResultHeader({ summary, onRedo, onBack, redoLabel = "Redo" }: {
  summary?: string; onRedo: () => void; onBack: () => void; redoLabel?: string;
}) {
  return (
    <div className="rounded-2xl px-4 py-4"
      style={{ background: "linear-gradient(135deg,#0d1f3c 0%,#1a3a6e 60%,#1e5799 100%)", boxShadow: "0 4px 20px rgba(13,31,60,0.2)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span className="text-white font-bold text-sm uppercase tracking-wider" style={{ fontFamily: FONT }}>Your AI Plan</span>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={onRedo}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
            style={{ background: "rgba(255,255,255,0.1)", color: "rgba(200,225,255,0.8)" }}>
            <RefreshCw className="w-3 h-3" />{redoLabel}
          </button>
          <button type="button" onClick={onBack}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
            style={{ background: "rgba(255,255,255,0.1)", color: "rgba(200,225,255,0.8)" }}>
            <ArrowLeft className="w-3 h-3" />Back
          </button>
        </div>
      </div>
      {summary && <p className="text-sm leading-relaxed" style={{ color: "rgba(200,225,255,0.9)" }}>{summary}</p>}
    </div>
  );
}

function TipsCard({ tips, accent }: { tips: string[]; accent: string }) {
  if (!tips || tips.length === 0) return null;
  return (
    <Card>
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-full" style={{ background: accent }} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Coach's Notes</span>
        </div>
        <ul className="flex flex-col gap-2">
          {tips.map((tip, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-slate-700 leading-snug">
              <span className="font-bold shrink-0" style={{ color: accent }}>{i + 1}.</span>{tip}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function SafetyBanner({ text }: { text: string }) {
  return (
    <div className="rounded-2xl px-4 py-3 flex gap-2" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
      <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
      <p className="text-xs text-amber-800 leading-relaxed">{text}</p>
    </div>
  );
}

function DisclaimerFooter() {
  return (
    <div className="rounded-xl px-4 py-3 flex gap-2" style={{ background: "rgba(255,255,255,0.7)" }}>
      <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
      <p className="text-[10px] text-slate-400 leading-relaxed">
        Educational readiness guidance only — not medical advice. For medical conditions, injuries, eating disorders, pregnancy, or medications, consult a qualified healthcare professional.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AICoach({ result, inputs }: AICoachProps) {
  const [activeTab,   setActiveTab]   = useState<Tab>("nutrition");
  const [view,        setView]        = useState<View>("home");
  const [nutForm,     setNutForm]     = useState<NutritionForm>(DEFAULT_NUT);
  const [wktForm,     setWktForm]     = useState<WorkoutForm>(DEFAULT_WKT);
  const [nutPickId,   setNutPickId]   = useState<NutPickId | null>(null);
  const [wktPickId,   setWktPickId]   = useState<WktPickId | null>(null);
  const [response,    setResponse]    = useState<CoachResponse | null>(null);
  const rawRef  = useRef("");
  const rawLen  = useRef(0);
  const [streamTick, setStreamTick]   = useState(0);

  const sharedBody = {
    sex: inputs.sex, age: inputs.age, heightInches: inputs.heightInches,
    weightLbs: inputs.weightLbs, estimatedBodyFat: result.estimatedBodyFat,
    effectiveMaxBodyFat: result.effectiveMaxBodyFat,
    maxAllowableWeight: result.maxAllowableWeight,
    riskLevel: result.riskLevel, pftScore: inputs.pftScore, cftScore: inputs.cftScore,
  };

  const generate = async (body: object) => {
    setView("loading");
    setResponse(null);
    rawRef.current = "";
    rawLen.current = 0;

    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sharedBody, ...body }),
      });
      if (!res.ok) throw new Error("Server error");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const msg = JSON.parse(line.slice(6));
            if (msg.error) throw new Error(msg.error);
            if (msg.done) {
              const parsed = parseStreamedJSON(rawRef.current);
              if (parsed) { setResponse(parsed); setView("done"); }
              else          setView("error");
              return;
            }
            if (msg.content) {
              rawRef.current += msg.content;
              rawLen.current  = rawRef.current.length;
              setStreamTick(t => t + 1);
            }
          } catch { /* skip bad lines */ }
        }
      }
    } catch { setView("error"); }
  };

  const reset = (tab?: Tab) => {
    setView("home");
    setResponse(null);
    rawRef.current = "";
    rawLen.current = 0;
    if (tab) setActiveTab(tab);
  };

  const handleTabChange = (t: Tab) => {
    setActiveTab(t);
    if (view !== "home") setView("home");
  };

  // ── Nutrition quick pick click ──────────────────────────────────────────────
  const handleNutPick = (pick: typeof NUTRITION_PICKS[number]) => {
    setNutPickId(pick.id as NutPickId);
    if (pick.mode === "form") {
      const preset = pick.id === "lose-weight-performance"
        ? { ...DEFAULT_NUT, goal: "lose fat while maintaining PFT/CFT performance" }
        : DEFAULT_NUT;
      setNutForm(preset);
      setView("nutForm");
    } else {
      generate({ mode: "quickPick", quickPickType: pick.id });
    }
  };

  // ── Workout quick pick click ────────────────────────────────────────────────
  const handleWktPick = (pick: typeof WORKOUT_PICKS[number]) => {
    setWktPickId(pick.id as WktPickId);
    if (pick.mode === "form") {
      setWktForm(DEFAULT_WKT);
      setView("wktForm");
    } else {
      generate({ mode: "quickPick", quickPickType: pick.id });
    }
  };

  // ── Form submits ────────────────────────────────────────────────────────────
  const handleNutSubmit = () => generate({
    mode: "fullPlan",
    goal: nutForm.goal, activityLevel: nutForm.activityLevel,
    trainingFrequency: nutForm.trainingFrequency,
    dietaryRestrictions: nutForm.dietaryRestrictions,
    targetTimeline: nutForm.targetTimeline,
  });

  const handleWktSubmit = () => generate({
    mode: "workoutOnly",
    workoutGoal: wktForm.workoutGoal, fitnessLevel: wktForm.fitnessLevel,
    equipment: wktForm.equipment, trainingDays: wktForm.trainingDays,
    injuries: wktForm.injuries,
  });

  // ── HOME ────────────────────────────────────────────────────────────────────
  if (view === "home") {
    const picks = activeTab === "nutrition" ? NUTRITION_PICKS : WORKOUT_PICKS;
    return (
      <div className="flex flex-col gap-3">
        <TabBar active={activeTab} onChange={handleTabChange} />
        <CoachHeader tab={activeTab} />
        <div className="grid grid-cols-2 gap-2">
          {picks.map((pick) => (
            <button key={pick.id} type="button"
              onClick={() => activeTab === "nutrition"
                ? handleNutPick(pick as typeof NUTRITION_PICKS[number])
                : handleWktPick(pick as typeof WORKOUT_PICKS[number])}
              className="flex flex-col items-start gap-1.5 px-3 py-3 rounded-2xl text-left transition-all active:scale-95 hover:brightness-95"
              style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 8px rgba(15,31,60,0.07)" }}>
              <span className="text-xl">{pick.icon}</span>
              <span className="text-xs font-bold text-slate-700 leading-snug">{pick.label}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest"
                style={{ color: pick.mode === "form" ? "#2563eb" : "#16a34a" }}>
                {pick.mode === "form" ? "Full Plan →" : "Quick Answer →"}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── FORMS ───────────────────────────────────────────────────────────────────
  if (view === "nutForm") {
    return (
      <div className="flex flex-col gap-3">
        <TabBar active={activeTab} onChange={handleTabChange} />
        <NutritionForm form={nutForm}
          onChange={(k, v) => setNutForm(p => ({ ...p, [k]: v }))}
          onSubmit={handleNutSubmit} onBack={() => setView("home")} />
      </div>
    );
  }

  if (view === "wktForm") {
    return (
      <div className="flex flex-col gap-3">
        <TabBar active={activeTab} onChange={handleTabChange} />
        <WorkoutFormCard form={wktForm}
          onChange={(k, v) => setWktForm(p => ({ ...p, [k]: v }))}
          onSubmit={handleWktSubmit} onBack={() => setView("home")} />
      </div>
    );
  }

  // ── LOADING ─────────────────────────────────────────────────────────────────
  if (view === "loading") {
    void streamTick; // keep render reactive
    return (
      <div className="flex flex-col gap-3">
        <TabBar active={activeTab} onChange={handleTabChange} />
        <LoadingView rawLen={rawLen.current} tab={activeTab} />
      </div>
    );
  }

  // ── ERROR ───────────────────────────────────────────────────────────────────
  if (view === "error") {
    return (
      <div className="flex flex-col gap-3">
        <TabBar active={activeTab} onChange={handleTabChange} />
        <Card>
          <div className="px-5 py-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-bold">Failed to generate plan</p>
            </div>
            <p className="text-xs text-slate-500">Something went wrong. Check your connection and try again.</p>
            <button type="button" onClick={() => reset()}
              className="flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-widest self-start"
              style={{ background: "#f1f5f9", color: "#64748b" }}>
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // ── DONE ────────────────────────────────────────────────────────────────────
  if (!response) return null;

  // Hard refusal
  if (response.mode === "refusal" || response.hardRefusal) {
    return (
      <div className="flex flex-col gap-3">
        <TabBar active={activeTab} onChange={handleTabChange} />
        <Card>
          <div className="px-4 py-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-bold text-slate-800 uppercase tracking-wider" style={{ fontFamily: FONT }}>Safety Response</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{response.hardRefusal}</p>
          </div>
        </Card>
        <button type="button" onClick={() => reset()}
          className="flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-widest self-start"
          style={{ background: "rgba(255,255,255,0.92)", color: "#64748b" }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>
    );
  }

  // Quick pick result
  if (response.mode === "quickPick") {
    return (
      <div className="flex flex-col gap-3">
        <TabBar active={activeTab} onChange={handleTabChange} />
        <ResultHeader summary={response.summary} onRedo={() => {
          const id = activeTab === "nutrition" ? nutPickId : wktPickId;
          if (id) generate({ mode: "quickPick", quickPickType: id });
        }} onBack={() => reset()} />
        {response.bullets && response.bullets.length > 0 && (
          <Card>
            <div className="px-4 py-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full bg-blue-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Key Points</span>
              </div>
              <ul className="flex flex-col gap-2">
                {response.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-slate-700 leading-snug">
                    <span className="font-bold text-blue-500 shrink-0">{i + 1}.</span>{b}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        )}
        {response.safetyNote && <SafetyBanner text={response.safetyNote} />}
        <DisclaimerFooter />
      </div>
    );
  }

  // Workout-only result
  if (response.mode === "workoutOnly") {
    const weeks = response.weeks ?? [];
    return (
      <div className="flex flex-col gap-3">
        <TabBar active={activeTab} onChange={handleTabChange} />
        <ResultHeader summary={response.summary}
          onRedo={() => generate({ mode: "workoutOnly", workoutGoal: wktForm.workoutGoal, fitnessLevel: wktForm.fitnessLevel, equipment: wktForm.equipment, trainingDays: wktForm.trainingDays, injuries: wktForm.injuries })}
          onBack={() => reset()} redoLabel="Redo" />
        {(response.keyTips ?? []).length > 0 && <TipsCard tips={response.keyTips!} accent="#2563eb" />}
        <CollapsibleSection icon={<Dumbbell className="w-4 h-4 text-white" />} label="4-Week Workout Plan"
          accent="linear-gradient(135deg,#2563eb,#1d4ed8)">
          <WorkoutWeeks weeks={weeks} />
        </CollapsibleSection>
        <DisclaimerFooter />
      </div>
    );
  }

  // Full plan result (nutrition + workout)
  return (
    <div className="flex flex-col gap-3">
      <TabBar active={activeTab} onChange={handleTabChange} />
      <ResultHeader summary={response.summary}
        onRedo={() => generate({ mode: "fullPlan", goal: nutForm.goal, activityLevel: nutForm.activityLevel, trainingFrequency: nutForm.trainingFrequency, dietaryRestrictions: nutForm.dietaryRestrictions, targetTimeline: nutForm.targetTimeline })}
        onBack={() => reset()} />
      {response.calorieAtSafeMinimum && (
        <SafetyBanner text="Calorie floor applied — your calculated target was below the safe minimum. Do not go below this without medical supervision." />
      )}
      {response.safetyWarning && <SafetyBanner text={response.safetyWarning} />}
      {(response.coachingTips ?? []).length > 0 && <TipsCard tips={response.coachingTips!} accent="#f59e0b" />}
      <NutritionResults data={response} />
      {response.workoutPlan && <WorkoutPlanSection plan={response.workoutPlan} />}
      <DisclaimerFooter />
    </div>
  );
}
