/**
 * ProfileLoader — save / load Marine profiles.
 * Shown at top of CalculatorForm (load) and in ResultSection (save/update).
 */
import { useState } from "react";
import { User, ChevronDown, ChevronUp, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MarineProfile,
  loadProfiles,
  upsertProfile,
  deleteProfile,
  newProfileId,
  getActiveProfileId,
  setActiveProfileId,
  pushAssessmentHistory,
} from "@/lib/storage";
import { RegResult } from "@/lib/marineStandards";
import { FormData } from "@/lib/validation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SaveButtonProps {
  result: RegResult;
  inputs: FormData;
  activeProfileId: string | null;
  onSaved: (id: string) => void;
}

interface LoadPanelProps {
  onLoad: (profile: MarineProfile) => void;
  activeProfileId: string | null;
}

// ── Save / Update ─────────────────────────────────────────────────────────────

export function SaveProfileButton({ result, inputs, activeProfileId, onSaved }: SaveButtonProps) {
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);

  const isUpdate = !!activeProfileId;

  const buildProfile = (id: string, profileName: string): MarineProfile => {
    const now = new Date().toISOString();
    const existing = activeProfileId
      ? loadProfiles().find((p) => p.id === activeProfileId)
      : null;
    const base: MarineProfile = {
      id,
      name: profileName,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      sex: inputs.sex,
      age: inputs.age,
      heightInches: inputs.heightInches,
      weightLbs: inputs.weightLbs,
      neckInches: inputs.neckInches,
      waistInches: inputs.waistInches,
      hipInches: inputs.hipInches,
      pftScore: inputs.pftScore,
      cftScore: inputs.cftScore,
      riskLevel: result.riskLevel,
      passFailStatus: result.passFailStatus,
      estimatedBodyFat: result.estimatedBodyFat,
      effectiveMaxBodyFat: result.effectiveMaxBodyFat,
      maxAllowableWeight: result.maxAllowableWeight,
      overWeightLimit: result.overWeightLimit,
      tapeRequired: result.tapeRequired,
      goalWeight: existing?.goalWeight,
      weeklyGoalLbs: existing?.weeklyGoalLbs,
      weightLog: existing?.weightLog ?? [],
      assessmentHistory: existing?.assessmentHistory ?? [],
    };
    // Push this assessment as a history entry
    return pushAssessmentHistory(base, {
      date: now,
      weight: Number(inputs.weightLbs),
      neckInches: Number(inputs.neckInches),
      waistInches: Number(inputs.waistInches),
      hipInches: inputs.hipInches ? Number(inputs.hipInches) : undefined,
      pftScore: Number(inputs.pftScore),
      cftScore: Number(inputs.cftScore),
      estimatedBodyFat: result.estimatedBodyFat,
      riskLevel: result.riskLevel,
      passFailStatus: result.passFailStatus,
    });
  };

  const doSave = (profileName: string) => {
    const id = activeProfileId ?? newProfileId();
    const profile = buildProfile(id, profileName);
    upsertProfile(profile);
    setActiveProfileId(id);
    onSaved(id);
    setSaved(true);
    setShowNameInput(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleClick = () => {
    if (isUpdate) {
      const existing = loadProfiles().find((p) => p.id === activeProfileId);
      doSave(existing?.name ?? autoName());
    } else {
      setName(autoName());
      setShowNameInput(true);
    }
  };

  if (saved) {
    return (
      <div className="flex items-center justify-center gap-2 h-10 text-primary text-xs font-bold uppercase tracking-widest">
        <CheckCircle2 className="w-4 h-4" />
        Profile Saved
      </div>
    );
  }

  if (showNameInput) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Profile Name
        </label>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-card font-mono text-sm flex-1"
            placeholder="e.g. Lance Cpl Smith"
            autoFocus
          />
          <Button
            type="button"
            size="sm"
            className="uppercase tracking-wider text-xs h-10 font-bold shrink-0"
            onClick={() => doSave(name.trim() || autoName())}
          >
            Save
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs h-10 shrink-0 text-muted-foreground"
            onClick={() => setShowNameInput(false)}
          >
            ✕
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full h-10 uppercase tracking-widest text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 gap-2"
      onClick={handleClick}
    >
      <User className="w-3.5 h-3.5" />
      {isUpdate ? "Update Profile" : "Save This Assessment"}
    </Button>
  );
}

// ── Load Panel ────────────────────────────────────────────────────────────────

export function LoadProfilePanel({ onLoad, activeProfileId }: LoadPanelProps) {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<MarineProfile[]>(() => loadProfiles());

  const refresh = () => setProfiles(loadProfiles());

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteProfile(id);
    if (id === getActiveProfileId()) setActiveProfileId(null);
    refresh();
  };

  if (profiles.length === 0) return null;

  const riskColor = (r: string) =>
    r === "In Regs" ? "text-primary" : r === "Watch Zone" ? "text-yellow-600" : "text-destructive";

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); refresh(); }}
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Saved Profiles ({profiles.length})
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="flex flex-col divide-y divide-border">
          {profiles.map((p) => (
            <div
              key={p.id}
              className={`flex items-center justify-between px-4 py-3 gap-3 cursor-pointer hover:bg-muted/30 transition-colors ${
                p.id === activeProfileId ? "bg-primary/5" : ""
              }`}
              onClick={() => { onLoad(p); setOpen(false); }}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono font-bold text-foreground truncate">{p.name}</p>
                  {p.id === activeProfileId && (
                    <span className="text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {formatDate(p.updatedAt)} · {p.weightLbs} lbs ·{" "}
                  <span className={riskColor(p.riskLevel)}>{p.riskLevel}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => handleDelete(p.id, e)}
                className="shrink-0 p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Delete profile"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function autoName(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
