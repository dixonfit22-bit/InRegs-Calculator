import { useState, useRef, useEffect } from "react";
import { FormData, validateInputs, ValidationErrors } from "@/lib/validation";
import { calculateRegStatus, RegResult } from "@/lib/marineStandards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ResultSection } from "./ResultSection";
import { LoadProfilePanel } from "./ProfileLoader";
import { MarineProfile, setActiveProfileId as persistActiveId } from "@/lib/storage";

const INITIAL_FORM: FormData = {
  sex: "",
  age: "",
  heightInches: "",
  weightLbs: "",
  neckInches: "",
  waistInches: "",
  hipInches: "",
  pftScore: "",
  cftScore: "",
};

interface CalculatorFormProps {
  profileToLoad?: MarineProfile | null;
  onProfileLoaded?: () => void;
}

// ── Shared card wrapper for each form section ─────────────────────────────────

function SectionCard({
  label,
  accentColor,
  children,
}: {
  label: string;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl flex flex-col gap-4 p-5"
      style={{
        background: "rgba(255,255,255,0.92)",
        boxShadow: "0 2px 12px rgba(15,31,60,0.08), 0 1px 3px rgba(15,31,60,0.06)",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-1 h-5 rounded-full"
          style={{ background: accentColor }}
        />
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "#64748b" }}
        >
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

// ── Labelled field ────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span
        className="text-xs font-bold uppercase tracking-widest"
        style={{ color: "#475569" }}
      >
        {label}
      </span>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function CalculatorForm({ profileToLoad, onProfileLoaded }: CalculatorFormProps = {}) {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [result, setResult] = useState<RegResult | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [activeProfileName, setActiveProfileName] = useState<string | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);

  const handleLoadProfile = (profile: MarineProfile) => {
    setForm({
      sex: profile.sex,
      age: profile.age,
      heightInches: profile.heightInches,
      weightLbs: profile.weightLbs,
      neckInches: profile.neckInches,
      waistInches: profile.waistInches,
      hipInches: profile.hipInches,
      pftScore: profile.pftScore,
      cftScore: profile.cftScore,
    });
    setActiveProfileId(profile.id);
    setActiveProfileName(profile.name);
    persistActiveId(profile.id);
    setResult(null);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (profileToLoad) {
      handleLoadProfile(profileToLoad);
      onProfileLoaded?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileToLoad]);

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateInputs(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const calculatedResult = calculateRegStatus({
      sex: form.sex as "male" | "female",
      age: Number(form.age),
      heightInches: Number(form.heightInches),
      weightLbs: Number(form.weightLbs),
      neckInches: Number(form.neckInches),
      waistInches: Number(form.waistInches),
      hipInches: form.hipInches ? Number(form.hipInches) : undefined,
      pftScore: Number(form.pftScore),
      cftScore: Number(form.cftScore),
    });

    setResult(calculatedResult);

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setResult(null);
    setErrors({});
    setActiveProfileId(null);
    setActiveProfileName(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const inputCls = "h-12 text-base font-mono bg-white border-slate-200 focus-visible:ring-blue-500 rounded-xl";

  return (
    <>
      {/* ── Hero card ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{
          background: "linear-gradient(135deg, #0d1f3c 0%, #1a3a6e 55%, #1e5799 100%)",
          boxShadow: "0 4px 24px rgba(13,31,60,0.28)",
        }}
      >
        {/* Subtle camo texture overlay */}
        <svg
          aria-hidden="true"
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.06 }}
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <pattern id="hcamo" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <rect x="0"  y="0"  width="22" height="12" fill="white"/>
              <rect x="35" y="0"  width="18" height="9"  fill="white"/>
              <rect x="65" y="4"  width="15" height="8"  fill="white"/>
              <rect x="8"  y="18" width="20" height="10" fill="white"/>
              <rect x="45" y="15" width="28" height="11" fill="white"/>
              <rect x="0"  y="32" width="16" height="12" fill="white"/>
              <rect x="28" y="28" width="24" height="9"  fill="white"/>
              <rect x="62" y="26" width="18" height="13" fill="white"/>
              <rect x="5"  y="46" width="28" height="10" fill="white"/>
              <rect x="48" y="42" width="20" height="12" fill="white"/>
              <rect x="0"  y="60" width="18" height="12" fill="white"/>
              <rect x="32" y="58" width="26" height="10" fill="white"/>
              <rect x="68" y="55" width="12" height="14" fill="white"/>
              <rect x="10" y="72" width="22" height="8"  fill="white"/>
              <rect x="50" y="70" width="18" height="10" fill="white"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hcamo)"/>
        </svg>

        <div className="relative px-5 py-6 flex flex-col gap-3">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <div
              className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5"
              style={{ background: "rgba(34,197,94,0.2)", color: "#86efac", border: "1px solid rgba(34,197,94,0.25)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              Ready to Calculate
            </div>
          </div>

          {/* Title */}
          <div>
            <h2
              className="text-3xl font-bold leading-tight"
              style={{
                fontFamily: "'Rajdhani', 'JetBrains Mono', monospace",
                color: "#ffffff",
                letterSpacing: "0.04em",
              }}
            >
              BCP Readiness Check
            </h2>
            <p
              className="text-sm mt-1"
              style={{ color: "rgba(180,210,255,0.85)", fontFamily: "'JetBrains Mono', monospace" }}
            >
              Know where you stand before weigh-in.
            </p>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }} className="pt-2">
            <p
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "rgba(150,190,255,0.6)" }}
            >
              Accurate to MCBul 6110 · MARADMIN 066/26
            </p>
          </div>
        </div>
      </div>

      {/* ── Saved profiles panel ───────────────────────────────────────────── */}
      <LoadProfilePanel onLoad={handleLoadProfile} activeProfileId={activeProfileId} />

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Personal Info */}
        <SectionCard label="Personal Info" accentColor="#2563eb">
          {/* Sex */}
          <Field label="Sex" error={errors.sex}>
            <RadioGroup
              value={form.sex}
              onValueChange={(val) => handleChange("sex", val)}
              className="flex gap-4 pt-1"
              data-testid="select-sex"
            >
              {(["male", "female"] as const).map((val) => (
                <label
                  key={val}
                  className="flex items-center gap-2.5 cursor-pointer"
                >
                  <RadioGroupItem value={val} id={val} />
                  <span className="text-sm font-bold uppercase tracking-wider text-foreground capitalize">
                    {val}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Age" error={errors.age}>
              <Input
                id="age"
                type="number"
                inputMode="numeric"
                placeholder="Enter age"
                value={form.age}
                onChange={(e) => handleChange("age", e.target.value)}
                data-testid="input-age"
                className={inputCls}
              />
            </Field>

            <Field label="Height (in)" error={errors.heightInches}>
              <Input
                id="heightInches"
                type="number"
                inputMode="decimal"
                placeholder="Enter height"
                value={form.heightInches}
                onChange={(e) => handleChange("heightInches", e.target.value)}
                data-testid="input-height"
                className={inputCls}
              />
            </Field>
          </div>
        </SectionCard>

        {/* Body Measurements */}
        <SectionCard label="Body Measurements" accentColor="#16a34a">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Weight (lbs)" error={errors.weightLbs}>
              <Input
                id="weightLbs"
                type="number"
                inputMode="decimal"
                placeholder="Enter weight"
                value={form.weightLbs}
                onChange={(e) => handleChange("weightLbs", e.target.value)}
                data-testid="input-weight"
                className={inputCls}
              />
            </Field>

            <Field label="Neck (in)" error={errors.neckInches}>
              <Input
                id="neckInches"
                type="number"
                inputMode="decimal"
                step="0.5"
                placeholder="Enter neck"
                value={form.neckInches}
                onChange={(e) => handleChange("neckInches", e.target.value)}
                data-testid="input-neck"
                className={inputCls}
              />
            </Field>

            <Field
              label="Waist at navel (in)"
              error={errors.waistInches}
              className={form.sex === "female" ? "" : "col-span-2"}
            >
              <Input
                id="waistInches"
                type="number"
                inputMode="decimal"
                step="0.5"
                placeholder="Enter waist"
                value={form.waistInches}
                onChange={(e) => handleChange("waistInches", e.target.value)}
                data-testid="input-waist"
                className={inputCls}
              />
            </Field>

            {form.sex === "female" && (
              <Field label="Hip widest point (in)" error={errors.hipInches}>
                <Input
                  id="hipInches"
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  placeholder="Enter hip"
                  value={form.hipInches}
                  onChange={(e) => handleChange("hipInches", e.target.value)}
                  data-testid="input-hip"
                  className={inputCls}
                />
              </Field>
            )}
          </div>
        </SectionCard>

        {/* Fitness Scores */}
        <SectionCard label="Fitness Scores" accentColor="#d97706">
          <div className="grid grid-cols-2 gap-3">
            <Field label="PFT Score" error={errors.pftScore}>
              <Input
                id="pftScore"
                type="number"
                inputMode="numeric"
                placeholder="0 – 300"
                value={form.pftScore}
                onChange={(e) => handleChange("pftScore", e.target.value)}
                data-testid="input-pft"
                className={inputCls}
              />
            </Field>

            <Field label="CFT Score" error={errors.cftScore}>
              <Input
                id="cftScore"
                type="number"
                inputMode="numeric"
                placeholder="0 – 300"
                value={form.cftScore}
                onChange={(e) => handleChange("cftScore", e.target.value)}
                data-testid="input-cft"
                className={inputCls}
              />
            </Field>
          </div>
        </SectionCard>

        {/* Submit */}
        <button
          type="submit"
          data-testid="button-submit"
          className="w-full h-14 rounded-2xl font-bold uppercase tracking-widest text-sm text-white transition-all duration-150 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%)",
            boxShadow: "0 4px 20px rgba(37,99,235,0.45)",
            fontFamily: "'Rajdhani', 'JetBrains Mono', monospace",
            fontSize: "1rem",
            letterSpacing: "0.12em",
          }}
        >
          Run Assessment →
        </button>
      </form>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      <div ref={resultsRef} className="scroll-mt-4 pb-20">
        {result && (
          <ResultSection
            result={result}
            inputs={form}
            pftScore={Number(form.pftScore)}
            cftScore={Number(form.cftScore)}
            onReset={handleReset}
            activeProfileId={activeProfileId}
            marineName={activeProfileName ?? undefined}
            onProfileSaved={(id, displayName) => {
              setActiveProfileId(id);
              if (displayName) setActiveProfileName(displayName);
            }}
          />
        )}
      </div>
    </>
  );
}
