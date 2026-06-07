import { useState, useRef } from "react";
import {
  Sparkles, ChevronDown, ChevronUp, Dumbbell, Utensils,
  Loader2, AlertCircle, RefreshCw, ShieldAlert, ArrowLeft,
} from "lucide-react";
import { RegResult } from "@/lib/marineStandards";
import { FormData } from "@/lib/validation";

interface AICoachProps {
  result: RegResult;
  inputs: FormData;
}

// ── Response types ────────────────────────────────────────────────────────────

interface SampleMeal   { meal: string; description: string; calories: number; }
interface WorkoutSession { day: string; type: string; details: string; }
interface WorkoutWeek  { label: string; sessions: WorkoutSession[]; }

interface CoachResponse {
  mode: "fullPlan" | "quickPick" | "refusal";
  hardRefusal?: string;
  safetyWarning?: string;
  calorieAtSafeMinimum?: boolean;
  summary?: string;
  bullets?: string[];
  safetyNote?: string;
  // full plan
  dailyCalories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  hydrationOz?: number;
  weeklyWeightLossLbs?: number;
  mealStructure?: string;
  sampleDay?: SampleMeal[];
  chowHallOptions?: string[];
  fieldOptions?: string[];
  coachingTips?: string[];
  workoutPlan?: { goal: string; daysPerWeek: number; weeks: WorkoutWeek[] };
}

// ── Form state ────────────────────────────────────────────────────────────────

interface PlanForm {
  goal: string;
  activityLevel: string;
  trainingFrequency: string;
  dietaryRestrictions: string;
  targetTimeline: string;
}

const DEFAULT_FORM: PlanForm = {
  goal: "",
  activityLevel: "",
  trainingFrequency: "",
  dietaryRestrictions: "",
  targetTimeline: "",
};

// ── Quick pick definitions ────────────────────────────────────────────────────

const QUICK_PICKS = [
  { id: "safe-meal-plan",          label: "Build Me a Safe Meal Plan",              icon: "🥗", mode: "form"  },
  { id: "lose-weight-performance", label: "Lose Weight & Keep Performance",         icon: "📉", mode: "form"  },
  { id: "pre-pft-nutrition",       label: "What to Eat Before a PFT",              icon: "🏃", mode: "quick" },
  { id: "post-training-nutrition", label: "What to Eat After Training",             icon: "💪", mode: "quick" },
  { id: "chow-hall-options",       label: "Best Chow Hall Options",                 icon: "🍽️", mode: "quick" },
  { id: "field-options",           label: "Field-Friendly Options",                 icon: "🪖", mode: "quick" },
  { id: "explain-risk",            label: "Explain My Body Comp Risk",              icon: "📊", mode: "quick" },
  { id: "grocery-list",            label: "Generate a Weekly Grocery List",         icon: "🛒", mode: "quick" },
] as const;

type QuickPickId = typeof QUICK_PICKS[number]["id"];

// ── Helpers ───────────────────────────────────────────────────────────────────

const DISPLAY = '"Rajdhani", "JetBrains Mono", monospace';

function parseStreamedJSON(raw: string): CoachResponse | null {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return JSON.parse(m[0]) as CoachResponse;
  } catch { return null; }
}

function workoutTypeStyle(type: string) {
  const t = type.toLowerCase();
  if (t.includes("run") || t.includes("cardio")) return { bg: "#eff6ff", text: "#2563eb" };
  if (t.includes("strength"))                     return { bg: "#f0fdf4", text: "#16a34a" };
  if (t.includes("rest"))                         return { bg: "#f8fafc", text: "#94a3b8" };
  return                                                 { bg: "#fefce8", text: "#d97706" };
}

// ── Small reusable pieces ─────────────────────────────────────────────────────

function Pill({
  label, value, unit, color,
}: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
      <span className="text-lg font-bold font-mono leading-none" style={{ color }}>
        {value}{unit}
      </span>
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 text-center">
        {label}
      </span>
    </div>
  );
}

function SectionCard({
  icon, label, accent, children, defaultOpen = true,
}: {
  icon: React.ReactNode; label: string; accent: string;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 12px rgba(15,31,60,0.08)" }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50/60 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: accent }}>
            {icon}
          </div>
          <span className="text-sm font-bold text-slate-800 uppercase tracking-wider"
            style={{ fontFamily: DISPLAY }}>
            {label}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" />
               : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div style={{ borderTop: "1px solid #e2e8f0" }}>{children}</div>}
    </div>
  );
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string; value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <option value="">Select…</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Meal + workout display sections ──────────────────────────────────────────

function MealSection({ data }: { data: CoachResponse }) {
  return (
    <SectionCard
      icon={<Utensils className="w-4 h-4 text-white" />}
      label="Nutrition Plan"
      accent="linear-gradient(135deg,#16a34a,#15803d)"
      defaultOpen
    >
      <div className="px-4 pb-4 pt-3 flex flex-col gap-4">
        {/* Macro bar */}
        <div className="rounded-xl p-3 flex items-center gap-1" style={{ background: "#f0fdf4" }}>
          <Pill label="Calories" value={data.dailyCalories!} unit="" color="#16a34a" />
          <div className="w-px h-8 bg-green-200 shrink-0" />
          <Pill label="Protein" value={data.proteinG!} unit="g" color="#2563eb" />
          <div className="w-px h-8 bg-green-200 shrink-0" />
          <Pill label="Carbs" value={data.carbsG!} unit="g" color="#d97706" />
          <div className="w-px h-8 bg-green-200 shrink-0" />
          <Pill label="Fat" value={data.fatG!} unit="g" color="#7c3aed" />
          <div className="w-px h-8 bg-green-200 shrink-0" />
          <Pill label="Water" value={data.hydrationOz!} unit="oz" color="#0891b2" />
        </div>

        {data.weeklyWeightLossLbs != null && (
          <p className="text-xs text-slate-500">
            Target rate: <strong className="text-slate-700">{data.weeklyWeightLossLbs} lb/week</strong>
          </p>
        )}

        {data.mealStructure && (
          <p className="text-xs text-slate-600 leading-relaxed">{data.mealStructure}</p>
        )}

        {/* Sample day */}
        {data.sampleDay && data.sampleDay.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Sample Day of Eating
            </p>
            {data.sampleDay.map((m) => (
              <div key={m.meal}
                className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: "#f8fafc" }}>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {m.meal}
                  </span>
                  <span className="text-sm text-slate-700 leading-snug">{m.description}</span>
                </div>
                <span className="text-sm font-bold font-mono text-green-700 shrink-0">
                  {m.calories} cal
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Chow hall */}
        {data.chowHallOptions && data.chowHallOptions.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              🍽️ Chow Hall Options
            </p>
            <ul className="flex flex-col gap-1.5">
              {data.chowHallOptions.map((o, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700 leading-snug">
                  <span className="text-green-500 shrink-0">•</span>{o}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Field options */}
        {data.fieldOptions && data.fieldOptions.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              🪖 Field / Convenience Options
            </p>
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
    </SectionCard>
  );
}

function WorkoutSection({ plan }: { plan: NonNullable<CoachResponse["workoutPlan"]> }) {
  const [activeWeek, setActiveWeek] = useState(0);
  return (
    <SectionCard
      icon={<Dumbbell className="w-4 h-4 text-white" />}
      label="4-Week Workout Plan"
      accent="linear-gradient(135deg,#2563eb,#1d4ed8)"
      defaultOpen
    >
      <div className="px-4 pb-4 pt-3 flex flex-col gap-4">
        <p className="text-xs text-slate-500 leading-relaxed">{plan.goal}</p>

        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {plan.weeks.map((w, i) => (
            <button key={i} onClick={() => setActiveWeek(i)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap"
              style={i === activeWeek
                ? { background: "#2563eb", color: "#fff" }
                : { background: "#f1f5f9", color: "#64748b" }}>
              {w.label.split("–")[0].replace("Week ", "Wk ")}
            </button>
          ))}
        </div>

        {plan.weeks[activeWeek] && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {plan.weeks[activeWeek].label}
            </p>
            {plan.weeks[activeWeek].sessions.map((s) => {
              const col = workoutTypeStyle(s.type);
              return (
                <div key={s.day} className="flex flex-col gap-1 px-3 py-2.5 rounded-xl"
                  style={{ background: "#f8fafc" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 w-12 shrink-0">
                      {s.day.slice(0, 3)}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ background: col.bg, color: col.text }}>
                      {s.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-snug">{s.details}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ── Plan form ─────────────────────────────────────────────────────────────────

function PlanForm({
  form, onChange, onSubmit, onBack, loading,
}: {
  form: PlanForm;
  onChange: (k: keyof PlanForm, v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  const canSubmit = form.goal && form.activityLevel && form.trainingFrequency && form.targetTimeline;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 12px rgba(15,31,60,0.08)" }}>
      <div className="px-4 py-3.5 flex items-center gap-3" style={{ borderBottom: "1px solid #e2e8f0" }}>
        <button type="button" onClick={onBack}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-slate-800 uppercase tracking-wider" style={{ fontFamily: DISPLAY }}>
          Plan Details
        </span>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        <SelectField
          label="Primary Goal"
          value={form.goal}
          onChange={v => onChange("goal", v)}
          options={[
            { value: "lose fat, stay in regs", label: "Lose Fat / Stay In Regs" },
            { value: "lose fat while maintaining PFT/CFT performance", label: "Lose Fat + Keep Performance" },
            { value: "maintain current weight and body composition", label: "Maintain Current Status" },
            { value: "gain muscle while minimizing fat gain", label: "Gain Muscle" },
            { value: "improve PFT/CFT performance", label: "Improve PFT / CFT Score" },
          ]}
        />

        <SelectField
          label="Activity Level (outside of planned workouts)"
          value={form.activityLevel}
          onChange={v => onChange("activityLevel", v)}
          options={[
            { value: "sedentary — desk job, minimal movement",    label: "Sedentary (desk job)" },
            { value: "lightly active — on feet, light duty",      label: "Lightly Active (light duty)" },
            { value: "moderately active — regular PT, walking",   label: "Moderately Active (regular PT)" },
            { value: "very active — daily training, field ops",   label: "Very Active (daily training / field)" },
          ]}
        />

        <SelectField
          label="Training Frequency"
          value={form.trainingFrequency}
          onChange={v => onChange("trainingFrequency", v)}
          options={[
            { value: "2", label: "2 days/week" },
            { value: "3", label: "3 days/week" },
            { value: "4", label: "4 days/week" },
            { value: "5", label: "5 days/week" },
            { value: "6", label: "6 days/week" },
          ]}
        />

        <SelectField
          label="Target Timeline"
          value={form.targetTimeline}
          onChange={v => onChange("targetTimeline", v)}
          options={[
            { value: "4 weeks (upcoming weigh-in)",  label: "4 Weeks (upcoming weigh-in)" },
            { value: "8 weeks",                      label: "8 Weeks" },
            { value: "12 weeks",                     label: "12 Weeks" },
            { value: "ongoing / long-term",          label: "Ongoing / Long-Term" },
          ]}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Dietary Restrictions / Preferences <span className="text-slate-400 normal-case font-normal">(optional)</span>
          </span>
          <input
            type="text"
            value={form.dietaryRestrictions}
            onChange={e => onChange("dietaryRestrictions", e.target.value)}
            placeholder="e.g. no pork, lactose intolerant, high-volume eater…"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 font-mono placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || loading}
          className="w-full h-12 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          style={{
            background: canSubmit && !loading
              ? "linear-gradient(135deg,#fbbf24,#f59e0b)"
              : "#e2e8f0",
            color: canSubmit && !loading ? "#1a1a1a" : "#94a3b8",
            boxShadow: canSubmit && !loading ? "0 4px 16px rgba(251,191,36,0.3)" : "none",
            fontFamily: DISPLAY,
            fontSize: "0.95rem",
            letterSpacing: "0.1em",
          }}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
            : <><Sparkles className="w-4 h-4" /> Generate My Plan</>}
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type View = "home" | "form" | "loading" | "done" | "error";

export function AICoach({ result, inputs }: AICoachProps) {
  const [view,         setView]         = useState<View>("home");
  const [planForm,     setPlanForm]      = useState<PlanForm>(DEFAULT_FORM);
  const [activePickId, setActivePickId] = useState<QuickPickId | null>(null);
  const [response,     setResponse]     = useState<CoachResponse | null>(null);
  const [streamText,   setStreamText]   = useState("");
  const rawRef = useRef("");

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
    setStreamText("");
    rawRef.current = "";

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
              setStreamText(rawRef.current);
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch { setView("error"); }
  };

  const handleQuickPick = (pick: typeof QUICK_PICKS[number]) => {
    if (pick.mode === "form") {
      // "Build me a plan" style → show form first
      setActivePickId(pick.id as QuickPickId);
      const preset = pick.id === "lose-weight-performance"
        ? { ...DEFAULT_FORM, goal: "lose fat while maintaining PFT/CFT performance" }
        : DEFAULT_FORM;
      setPlanForm(preset);
      setView("form");
    } else {
      // Direct quick-pick → generate immediately
      setActivePickId(pick.id as QuickPickId);
      generate({ mode: "quickPick", quickPickType: pick.id });
    }
  };

  const handleFormSubmit = () => {
    generate({
      mode: activePickId === "lose-weight-performance" ? "fullPlan" : "fullPlan",
      goal: planForm.goal,
      activityLevel: planForm.activityLevel,
      trainingFrequency: planForm.trainingFrequency,
      dietaryRestrictions: planForm.dietaryRestrictions,
      targetTimeline: planForm.targetTimeline,
    });
  };

  const reset = () => {
    setView("home");
    setActivePickId(null);
    setResponse(null);
    setStreamText("");
    rawRef.current = "";
  };

  // ── HOME ──────────────────────────────────────────────────────────────────

  if (view === "home") {
    return (
      <div className="flex flex-col gap-3">
        {/* Header card */}
        <div className="rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg,#0d1f3c 0%,#1a3a6e 60%,#1e5799 100%)",
            boxShadow: "0 4px 24px rgba(13,31,60,0.22)",
          }}>
          <div className="px-5 py-5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-yellow-300" />
              </div>
              <div>
                <p className="text-white font-bold text-sm" style={{ fontFamily: DISPLAY, letterSpacing: "0.05em" }}>
                  AI READINESS COACH
                </p>
                <p className="text-[10px]" style={{ color: "rgba(150,190,255,0.7)" }}>Powered by GPT-5</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(200,225,255,0.9)" }}>
              Get personalized nutrition and fitness guidance tailored to your BCP data. Choose a quick question or build a full 4-week plan.
            </p>
          </div>

          {/* Disclaimer */}
          <div className="px-4 py-3 flex gap-2" style={{ background: "rgba(0,0,0,0.2)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,220,130,0.85)" }}>
              <strong>Educational guidance only — not medical advice.</strong> For medical conditions, eating disorders, pregnancy, medications, or extreme weight-loss needs, consult a qualified healthcare professional.
            </p>
          </div>
        </div>

        {/* Quick picks grid */}
        <div className="grid grid-cols-2 gap-2">
          {QUICK_PICKS.map((pick) => (
            <button
              key={pick.id}
              type="button"
              onClick={() => handleQuickPick(pick)}
              className="flex flex-col items-start gap-1.5 px-3 py-3 rounded-2xl text-left transition-all active:scale-95 hover:brightness-95"
              style={{
                background: "rgba(255,255,255,0.92)",
                boxShadow: "0 2px 8px rgba(15,31,60,0.07)",
              }}
            >
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

  // ── FORM ──────────────────────────────────────────────────────────────────

  if (view === "form") {
    return (
      <PlanForm
        form={planForm}
        onChange={(k, v) => setPlanForm(prev => ({ ...prev, [k]: v }))}
        onSubmit={handleFormSubmit}
        onBack={reset}
        loading={false}
      />
    );
  }

  // ── LOADING ───────────────────────────────────────────────────────────────

  if (view === "loading") {
    const len = rawRef.current.length;
    const progress = Math.min(93, Math.round((len / 3500) * 100));
    const statusText = len < 80   ? "Analyzing your BCP data…"
                     : len < 500  ? "Calculating calorie and macro targets…"
                     : len < 1500 ? "Building your meal plan…"
                     : len < 2500 ? "Designing your workout program…"
                     :              "Finalizing your plan…";
    return (
      <div className="rounded-2xl px-5 py-6 flex flex-col gap-4"
        style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 12px rgba(15,31,60,0.08)" }}>
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-slate-800" style={{ fontFamily: DISPLAY }}>Building Your Plan…</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">GPT-5 is working</p>
          </div>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg,#2563eb,#7c3aed)" }} />
        </div>
        <p className="text-[11px] text-slate-400 italic">{statusText}</p>
      </div>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────

  if (view === "error") {
    return (
      <div className="rounded-2xl px-5 py-5 flex flex-col gap-3"
        style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 12px rgba(15,31,60,0.08)" }}>
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-bold">Failed to generate plan</p>
        </div>
        <p className="text-xs text-slate-500">Something went wrong. Check your connection and try again.</p>
        <div className="flex gap-2">
          <button type="button" onClick={reset}
            className="flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
            style={{ background: "#f1f5f9", color: "#64748b" }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <button type="button" onClick={() => view === "error" && reset()}
            className="flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
            style={{ background: "#eff6ff", color: "#2563eb" }}>
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  // ── DONE — render response ────────────────────────────────────────────────

  if (!response) return null;

  // Hard refusal
  if (response.mode === "refusal" || response.hardRefusal) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl px-4 py-4 flex flex-col gap-3"
          style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 8px rgba(15,31,60,0.07)" }}>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-bold text-slate-800 uppercase tracking-wider" style={{ fontFamily: DISPLAY }}>
              Safety Response
            </span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{response.hardRefusal}</p>
        </div>
        <button type="button" onClick={reset}
          className="flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-widest self-start transition-all"
          style={{ background: "rgba(255,255,255,0.92)", color: "#64748b" }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>
    );
  }

  // Quick pick response
  if (response.mode === "quickPick") {
    return (
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="rounded-2xl px-4 py-4"
          style={{
            background: "linear-gradient(135deg,#0d1f3c 0%,#1a3a6e 60%,#1e5799 100%)",
            boxShadow: "0 4px 20px rgba(13,31,60,0.2)",
          }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-white font-bold text-sm uppercase tracking-wider" style={{ fontFamily: DISPLAY }}>
                AI Coach
              </span>
            </div>
            <button type="button" onClick={reset}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "rgba(255,255,255,0.1)", color: "rgba(200,225,255,0.8)" }}>
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(200,225,255,0.9)" }}>
            {response.summary}
          </p>
        </div>

        {/* Bullets */}
        {response.bullets && response.bullets.length > 0 && (
          <div className="rounded-2xl px-4 py-4"
            style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 8px rgba(15,31,60,0.07)" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full" style={{ background: "#2563eb" }} />
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
        )}

        {response.safetyNote && (
          <div className="rounded-2xl px-4 py-3 flex gap-2"
            style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">{response.safetyNote}</p>
          </div>
        )}

        <p className="text-[10px] text-slate-400 text-center leading-relaxed px-2">
          Educational guidance only — not medical advice.
        </p>
      </div>
    );
  }

  // Full plan response
  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="rounded-2xl px-4 py-4"
        style={{
          background: "linear-gradient(135deg,#0d1f3c 0%,#1a3a6e 60%,#1e5799 100%)",
          boxShadow: "0 4px 20px rgba(13,31,60,0.2)",
        }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span className="text-white font-bold text-sm uppercase tracking-wider" style={{ fontFamily: DISPLAY }}>
              Your AI Plan
            </span>
          </div>
          <div className="flex gap-1">
            <button type="button" onClick={() => generate({
              mode: "fullPlan", goal: planForm.goal, activityLevel: planForm.activityLevel,
              trainingFrequency: planForm.trainingFrequency, dietaryRestrictions: planForm.dietaryRestrictions,
              targetTimeline: planForm.targetTimeline,
            })}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "rgba(255,255,255,0.1)", color: "rgba(200,225,255,0.8)" }}>
              <RefreshCw className="w-3 h-3" /> Redo
            </button>
            <button type="button" onClick={reset}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "rgba(255,255,255,0.1)", color: "rgba(200,225,255,0.8)" }}>
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
          </div>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "rgba(200,225,255,0.9)" }}>
          {response.summary}
        </p>
      </div>

      {/* Safety warning */}
      {response.calorieAtSafeMinimum && (
        <div className="rounded-2xl px-4 py-3 flex gap-2"
          style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Calorie floor applied.</strong> Your calculated target was below the safe minimum. The plan has been set to the lowest safe level for your sex. Do not go below this without medical supervision.
          </p>
        </div>
      )}

      {response.safetyWarning && (
        <div className="rounded-2xl px-4 py-3 flex gap-2"
          style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">{response.safetyWarning}</p>
        </div>
      )}

      {/* Coaching tips */}
      {response.coachingTips && response.coachingTips.length > 0 && (
        <div className="rounded-2xl px-4 py-4"
          style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 8px rgba(15,31,60,0.07)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full" style={{ background: "#f59e0b" }} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Coach's Notes</span>
          </div>
          <ul className="flex flex-col gap-2">
            {response.coachingTips.map((tip, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-slate-700 leading-snug">
                <span className="font-bold text-amber-500 shrink-0">{i + 1}.</span>{tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Meal section */}
      <MealSection data={response} />

      {/* Workout section */}
      {response.workoutPlan && <WorkoutSection plan={response.workoutPlan} />}

      {/* Footer disclaimer */}
      <div className="rounded-xl px-4 py-3 flex gap-2"
        style={{ background: "rgba(255,255,255,0.7)" }}>
        <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-400 leading-relaxed">
          This is educational readiness guidance only and is not medical advice. For medical conditions, eating disorders, pregnancy, medications, or extreme weight-loss needs, consult a qualified healthcare professional.
        </p>
      </div>
    </div>
  );
}
