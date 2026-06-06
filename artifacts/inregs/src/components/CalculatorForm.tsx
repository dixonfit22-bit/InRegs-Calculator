import { useState, useRef } from "react";
import { FormData, validateInputs, ValidationErrors } from "@/lib/validation";
import { calculateRegStatus, RegResult } from "@/lib/marineStandards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ResultSection } from "./ResultSection";
import { LoadProfilePanel } from "./ProfileLoader";
import { MarineProfile, setActiveProfileId as persistActiveId } from "@/lib/storage";
import { useEffect } from "react";

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

  // Load a profile passed in from the Command Dashboard "Edit" action
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

  const SectionDivider = ({ label }: { label: string }) => (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border"></div>
      </div>
      <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest">
        <span className="bg-background px-2 text-muted-foreground">{label}</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Profile loader — shown when at least one profile exists */}
      <LoadProfilePanel onLoad={handleLoadProfile} activeProfileId={activeProfileId} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-8">
        <SectionDivider label="Personal Info" />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 col-span-2">
            <Label>Sex</Label>
            <RadioGroup
              value={form.sex}
              onValueChange={(val) => handleChange("sex", val)}
              className="flex gap-4"
              data-testid="select-sex"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="male" id="male" />
                <Label htmlFor="male" className="font-normal cursor-pointer">
                  Male
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="female" id="female" />
                <Label htmlFor="female" className="font-normal cursor-pointer">
                  Female
                </Label>
              </div>
            </RadioGroup>
            {errors.sex && <p className="text-xs text-destructive">{errors.sex}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              inputMode="numeric"
              placeholder="17-65"
              value={form.age}
              onChange={(e) => handleChange("age", e.target.value)}
              data-testid="input-age"
              className="bg-card font-mono"
            />
            {errors.age && <p className="text-xs text-destructive">{errors.age}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="heightInches">Height (in)</Label>
            <Input
              id="heightInches"
              type="number"
              inputMode="decimal"
              placeholder="50-90"
              value={form.heightInches}
              onChange={(e) => handleChange("heightInches", e.target.value)}
              data-testid="input-height"
              className="bg-card font-mono"
            />
            {errors.heightInches && (
              <p className="text-xs text-destructive">{errors.heightInches}</p>
            )}
          </div>
        </div>

        <SectionDivider label="Body Measurements" />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="weightLbs">Weight (lbs)</Label>
            <Input
              id="weightLbs"
              type="number"
              inputMode="decimal"
              value={form.weightLbs}
              onChange={(e) => handleChange("weightLbs", e.target.value)}
              data-testid="input-weight"
              className="bg-card font-mono"
            />
            {errors.weightLbs && <p className="text-xs text-destructive">{errors.weightLbs}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="neckInches">Neck (in)</Label>
            <Input
              id="neckInches"
              type="number"
              inputMode="decimal"
              step="0.5"
              value={form.neckInches}
              onChange={(e) => handleChange("neckInches", e.target.value)}
              data-testid="input-neck"
              className="bg-card font-mono"
            />
            {errors.neckInches && <p className="text-xs text-destructive">{errors.neckInches}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="waistInches">Waist at navel (in)</Label>
            <Input
              id="waistInches"
              type="number"
              inputMode="decimal"
              step="0.5"
              value={form.waistInches}
              onChange={(e) => handleChange("waistInches", e.target.value)}
              data-testid="input-waist"
              className="bg-card font-mono"
            />
            {errors.waistInches && <p className="text-xs text-destructive">{errors.waistInches}</p>}
          </div>

          {form.sex === "female" && (
            <div className="space-y-2">
              <Label htmlFor="hipInches">Hip widest point (in)</Label>
              <Input
                id="hipInches"
                type="number"
                inputMode="decimal"
                step="0.5"
                value={form.hipInches}
                onChange={(e) => handleChange("hipInches", e.target.value)}
                data-testid="input-hip"
                className="bg-card font-mono"
              />
              {errors.hipInches && <p className="text-xs text-destructive">{errors.hipInches}</p>}
            </div>
          )}
        </div>

        <SectionDivider label="Fitness Scores" />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pftScore">PFT Score</Label>
            <Input
              id="pftScore"
              type="number"
              inputMode="numeric"
              placeholder="0-300"
              value={form.pftScore}
              onChange={(e) => handleChange("pftScore", e.target.value)}
              data-testid="input-pft"
              className="bg-card font-mono"
            />
            {errors.pftScore && <p className="text-xs text-destructive">{errors.pftScore}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cftScore">CFT Score</Label>
            <Input
              id="cftScore"
              type="number"
              inputMode="numeric"
              placeholder="0-300"
              value={form.cftScore}
              onChange={(e) => handleChange("cftScore", e.target.value)}
              data-testid="input-cft"
              className="bg-card font-mono"
            />
            {errors.cftScore && <p className="text-xs text-destructive">{errors.cftScore}</p>}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full mt-6 h-12 uppercase tracking-widest text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
          data-testid="button-submit"
        >
          Run Assessment →
        </Button>
      </form>

      <div ref={resultsRef} className="scroll-mt-6 pb-20">
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
