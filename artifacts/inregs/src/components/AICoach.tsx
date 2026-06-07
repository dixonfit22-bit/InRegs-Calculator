import { useState, useRef } from "react";
import { Sparkles, ChevronDown, ChevronUp, Dumbbell, Utensils, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { RegResult } from "@/lib/marineStandards";
import { FormData } from "@/lib/validation";

interface AICoachProps {
  result: RegResult;
  inputs: FormData;
}

// ── Types matching the AI JSON response ───────────────────────────────────────

interface Meal {
  name: string;
  description: string;
  calories: number;
}

interface DayMeals {
  day: string;
  meals: Meal[];
}

interface WorkoutSession {
  day: string;
  type: string;
  details: string;
}

interface WorkoutWeek {
  label: string;
  sessions: WorkoutSession[];
}

interface CoachPlan {
  summary: string;
  weeklyMealPlan: {
    dailyCalories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    rationale: string;
    days: DayMeals[];
  };
  workoutPlan: {
    goal: string;
    daysPerWeek: number;
    weeks: WorkoutWeek[];
  };
  keyTips: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DISPLAY = '"Rajdhani", "JetBrains Mono", monospace';

function parseStreamedJSON(raw: string): CoachPlan | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as CoachPlan;
  } catch {
    return null;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionToggle({
  icon,
  label,
  accent,
  children,
  defaultOpen = false,
}: {
  icon: React.ReactNode;
  label: string;
  accent: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 12px rgba(15,31,60,0.08)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-slate-50/60"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: accent }}
          >
            {icon}
          </div>
          <span className="text-sm font-bold text-slate-800 uppercase tracking-wider" style={{ fontFamily: DISPLAY }}>
            {label}
          </span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-slate-400" />
          : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div style={{ borderTop: "1px solid #e2e8f0" }}>{children}</div>}
    </div>
  );
}

function MacroBadge({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1">
      <span className="text-xl font-bold font-mono" style={{ color }}>{value}{unit}</span>
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
    </div>
  );
}

function MealPlanSection({ plan }: { plan: CoachPlan["weeklyMealPlan"] }) {
  const [activeDay, setActiveDay] = useState(0);
  const days = plan.days ?? [];

  return (
    <div className="px-4 pb-4 pt-3 flex flex-col gap-4">
      {/* Macros */}
      <div
        className="rounded-xl p-3 flex items-center gap-2"
        style={{ background: "#f0fdf4" }}
      >
        <MacroBadge label="Calories" value={plan.dailyCalories} unit="" color="#16a34a" />
        <div className="w-px h-8 bg-green-200" />
        <MacroBadge label="Protein" value={plan.proteinG} unit="g" color="#2563eb" />
        <div className="w-px h-8 bg-green-200" />
        <MacroBadge label="Carbs" value={plan.carbsG} unit="g" color="#d97706" />
        <div className="w-px h-8 bg-green-200" />
        <MacroBadge label="Fat" value={plan.fatG} unit="g" color="#7c3aed" />
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{plan.rationale}</p>

      {/* Day tabs */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 no-scrollbar">
        {days.map((d, i) => (
          <button
            key={d.day}
            onClick={() => setActiveDay(i)}
            className="shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
            style={
              i === activeDay
                ? { background: "#16a34a", color: "#fff" }
                : { background: "#f1f5f9", color: "#64748b" }
            }
          >
            {d.day.slice(0, 3)}
          </button>
        ))}
      </div>

      {/* Meals for active day */}
      {days[activeDay] && (
        <div className="flex flex-col gap-2">
          {days[activeDay].meals.map((meal) => (
            <div
              key={meal.name}
              className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: "#f8fafc" }}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{meal.name}</span>
                <span className="text-sm text-slate-700 leading-snug">{meal.description}</span>
              </div>
              <span className="text-sm font-bold font-mono text-green-700 shrink-0">{meal.calories} cal</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkoutSection({ plan }: { plan: CoachPlan["workoutPlan"] }) {
  const [activeWeek, setActiveWeek] = useState(0);
  const weeks = plan.weeks ?? [];

  const typeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("run") || t.includes("cardio")) return { bg: "#eff6ff", text: "#2563eb" };
    if (t.includes("strength")) return { bg: "#f0fdf4", text: "#16a34a" };
    if (t.includes("rest")) return { bg: "#f8fafc", text: "#94a3b8" };
    return { bg: "#fefce8", text: "#d97706" };
  };

  return (
    <div className="px-4 pb-4 pt-3 flex flex-col gap-4">
      <p className="text-xs text-slate-500 leading-relaxed">{plan.goal}</p>

      {/* Week tabs */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 no-scrollbar">
        {weeks.map((w, i) => (
          <button
            key={w.label}
            onClick={() => setActiveWeek(i)}
            className="shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap"
            style={
              i === activeWeek
                ? { background: "#2563eb", color: "#fff" }
                : { background: "#f1f5f9", color: "#64748b" }
            }
          >
            {w.label.split(":")[0]}
          </button>
        ))}
      </div>

      {/* Sessions */}
      {weeks[activeWeek] && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {weeks[activeWeek].label}
          </p>
          {weeks[activeWeek].sessions.map((s) => {
            const col = typeColor(s.type);
            return (
              <div key={s.day} className="flex flex-col gap-1 px-3 py-2.5 rounded-xl" style={{ background: "#f8fafc" }}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 w-14 shrink-0">{s.day.slice(0, 3)}</span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: col.bg, color: col.text }}
                  >
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
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AICoach({ result, inputs }: AICoachProps) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [plan, setPlan] = useState<CoachPlan | null>(null);
  const [streamText, setStreamText] = useState("");
  const rawRef = useRef("");

  const generate = async () => {
    setState("loading");
    setPlan(null);
    setStreamText("");
    rawRef.current = "";

    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sex: inputs.sex,
          age: inputs.age,
          heightInches: inputs.heightInches,
          weightLbs: inputs.weightLbs,
          estimatedBodyFat: result.estimatedBodyFat,
          effectiveMaxBodyFat: result.effectiveMaxBodyFat,
          maxAllowableWeight: result.maxAllowableWeight,
          riskLevel: result.riskLevel,
          pftScore: inputs.pftScore,
          cftScore: inputs.cftScore,
        }),
      });

      if (!res.ok) throw new Error("Server error");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const msg = JSON.parse(line.slice(6));
            if (msg.error) throw new Error(msg.error);
            if (msg.done) {
              const parsed = parseStreamedJSON(rawRef.current);
              if (parsed) {
                setPlan(parsed);
                setState("done");
              } else {
                setState("error");
              }
              return;
            }
            if (msg.content) {
              rawRef.current += msg.content;
              setStreamText(rawRef.current);
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch {
      setState("error");
    }
  };

  // ── Idle state ──────────────────────────────────────────────────────────────
  if (state === "idle") {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0d1f3c 0%, #1a3a6e 60%, #1e5799 100%)",
          boxShadow: "0 4px 24px rgba(13,31,60,0.22)",
        }}
      >
        <div className="px-5 py-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-yellow-300" />
            </div>
            <div>
              <p className="text-white font-bold text-sm" style={{ fontFamily: DISPLAY, letterSpacing: "0.05em" }}>
                AI COACH
              </p>
              <p className="text-[10px]" style={{ color: "rgba(150,190,255,0.7)" }}>
                Powered by GPT-5
              </p>
            </div>
          </div>

          <p className="text-sm leading-relaxed" style={{ color: "rgba(200,225,255,0.9)" }}>
            Get a personalized <strong style={{ color: "#fff" }}>4-week meal + workout plan</strong> built around your BCP results — calorie targets, macro splits, PT sessions, and daily workouts.
          </p>

          <button
            type="button"
            onClick={generate}
            className="w-full h-12 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
              color: "#1a1a1a",
              boxShadow: "0 4px 16px rgba(251,191,36,0.35)",
              fontFamily: DISPLAY,
              fontSize: "0.95rem",
              letterSpacing: "0.1em",
            }}
          >
            <Sparkles className="w-4 h-4" />
            Generate My Plan
          </button>
        </div>
      </div>
    );
  }

  // ── Loading state ───────────────────────────────────────────────────────────
  if (state === "loading") {
    const progress = Math.min(95, Math.round((rawRef.current.length / 3000) * 100));
    return (
      <div
        className="rounded-2xl px-5 py-6 flex flex-col gap-4"
        style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 12px rgba(15,31,60,0.08)" }}
      >
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-slate-800" style={{ fontFamily: DISPLAY }}>
              Building Your Plan...
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">GPT-5 is analyzing your BCP data</p>
          </div>
        </div>

        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg, #2563eb, #7c3aed)" }}
          />
        </div>

        <p className="text-[10px] text-slate-400 italic">
          {streamText.length < 100
            ? "Calculating your caloric needs and macro targets..."
            : streamText.length < 800
            ? "Structuring your weekly meal plan..."
            : streamText.length < 2000
            ? "Designing your PT and workout sessions..."
            : "Finalizing your personalized plan..."}
        </p>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div
        className="rounded-2xl px-5 py-5 flex flex-col gap-3"
        style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 12px rgba(15,31,60,0.08)" }}
      >
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-bold">Failed to generate plan</p>
        </div>
        <p className="text-xs text-slate-500">Something went wrong. Check your connection and try again.</p>
        <button
          type="button"
          onClick={generate}
          className="flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all self-start"
          style={{ background: "#eff6ff", color: "#2563eb" }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  // ── Done: plan rendered ─────────────────────────────────────────────────────
  if (!plan) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div
        className="rounded-2xl px-4 py-4"
        style={{
          background: "linear-gradient(135deg, #0d1f3c 0%, #1a3a6e 60%, #1e5799 100%)",
          boxShadow: "0 4px 20px rgba(13,31,60,0.2)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span className="text-white font-bold text-sm uppercase tracking-wider" style={{ fontFamily: DISPLAY }}>
              Your AI Plan
            </span>
          </div>
          <button
            type="button"
            onClick={generate}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{ background: "rgba(255,255,255,0.1)", color: "rgba(200,225,255,0.8)" }}
          >
            <RefreshCw className="w-3 h-3" />
            Regenerate
          </button>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "rgba(200,225,255,0.9)" }}>
          {plan.summary}
        </p>
      </div>

      {/* Key Tips */}
      {plan.keyTips?.length > 0 && (
        <div
          className="rounded-2xl px-4 py-4"
          style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 8px rgba(15,31,60,0.07)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full" style={{ background: "#f59e0b" }} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Key Tips</span>
          </div>
          <ul className="flex flex-col gap-2">
            {plan.keyTips.map((tip, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-slate-700 leading-snug">
                <span className="font-bold text-amber-500 shrink-0">{i + 1}.</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Meal plan collapsible */}
      <SectionToggle
        icon={<Utensils className="w-4 h-4 text-white" />}
        label="Weekly Meal Plan"
        accent="linear-gradient(135deg, #16a34a, #15803d)"
        defaultOpen={true}
      >
        <MealPlanSection plan={plan.weeklyMealPlan} />
      </SectionToggle>

      {/* Workout plan collapsible */}
      <SectionToggle
        icon={<Dumbbell className="w-4 h-4 text-white" />}
        label="4-Week Workout Plan"
        accent="linear-gradient(135deg, #2563eb, #1d4ed8)"
        defaultOpen={true}
      >
        <WorkoutSection plan={plan.workoutPlan} />
      </SectionToggle>

      <p className="text-[10px] text-slate-400 text-center leading-relaxed px-2">
        AI-generated plan for informational purposes only. Consult a medical or fitness professional before making significant changes to your diet or exercise routine.
      </p>
    </div>
  );
}
