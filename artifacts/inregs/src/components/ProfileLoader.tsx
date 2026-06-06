/**
 * ProfileLoader — save / load Marine profiles (cloud-synced via API).
 * Names follow the standard military format: Rank LastName, FI [MI]
 */
import { useState, useEffect } from "react";
import { User, ChevronDown, ChevronUp, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MarineProfile,
  newProfileId,
  getActiveProfileId,
  setActiveProfileId,
  pushAssessmentHistory,
  buildDisplayName,
} from "@/lib/storage";
import { apiGetProfiles, apiUpsertProfile, apiDeleteProfile } from "@/lib/api";
import { RegResult } from "@/lib/marineStandards";
import { FormData } from "@/lib/validation";

// ── USMC Ranks ────────────────────────────────────────────────────────────────

const ENLISTED = ["Pvt", "PFC", "LCpl", "Cpl", "Sgt", "SSgt", "GySgt", "MSgt", "1stSgt", "MGySgt", "SgtMaj", "SgtMajMC"];
const WARRANT  = ["WO1", "CWO2", "CWO3", "CWO4", "CWO5"];
const OFFICER  = ["2ndLt", "1stLt", "Capt", "Maj", "LtCol", "Col", "BGen", "MajGen", "LtGen", "Gen"];

// ── Types ─────────────────────────────────────────────────────────────────────

interface SaveButtonProps {
  result: RegResult;
  inputs: FormData;
  activeProfileId: string | null;
  onSaved: (id: string, displayName: string) => void;
}

interface LoadPanelProps {
  onLoad: (profile: MarineProfile) => void;
  activeProfileId: string | null;
}

// ── Name form state ───────────────────────────────────────────────────────────

interface NameFields {
  rank: string;
  firstName: string;
  middleName: string;
  lastName: string;
}

const DEFAULT_NAME: NameFields = { rank: "Cpl", firstName: "", middleName: "", lastName: "" };

// ── Save / Update ─────────────────────────────────────────────────────────────

export function SaveProfileButton({ result, inputs, activeProfileId, onSaved }: SaveButtonProps) {
  const [saved, setSaved]             = useState(false);
  const [saving, setSaving]           = useState(false);
  const [showForm, setShowForm]       = useState(false);
  const [fields, setFields]           = useState<NameFields>(DEFAULT_NAME);

  const isUpdate  = !!activeProfileId;
  const canSave   = fields.firstName.trim().length > 0 && fields.middleName.trim().length > 0 && fields.lastName.trim().length > 0;
  const preview   = canSave
    ? buildDisplayName(fields.rank, fields.lastName, fields.firstName, fields.middleName)
    : "";

  const set = (key: keyof NameFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFields((prev) => ({ ...prev, [key]: e.target.value }));

  // ── Build the full MarineProfile object ───────────────────────────────────

  const buildProfile = async (id: string, nameFields: NameFields): Promise<MarineProfile> => {
    const now  = new Date().toISOString();
    const displayName = buildDisplayName(nameFields.rank, nameFields.lastName, nameFields.firstName, nameFields.middleName);

    let existing: MarineProfile | undefined;
    if (activeProfileId) {
      const profiles = await apiGetProfiles();
      existing = profiles.find((p) => p.id === activeProfileId);
    }

    const base: MarineProfile = {
      id,
      name:       displayName,
      rank:       nameFields.rank,
      firstName:  nameFields.firstName.trim(),
      middleName: nameFields.middleName.trim() || undefined,
      lastName:   nameFields.lastName.trim(),
      createdAt:  existing?.createdAt ?? now,
      updatedAt:  now,
      sex:        inputs.sex,
      age:        inputs.age,
      heightInches: inputs.heightInches,
      weightLbs:    inputs.weightLbs,
      neckInches:   inputs.neckInches,
      waistInches:  inputs.waistInches,
      hipInches:    inputs.hipInches,
      pftScore:     inputs.pftScore,
      cftScore:     inputs.cftScore,
      riskLevel:    result.riskLevel,
      passFailStatus:    result.passFailStatus,
      estimatedBodyFat:  result.estimatedBodyFat,
      effectiveMaxBodyFat: result.effectiveMaxBodyFat,
      maxAllowableWeight:  result.maxAllowableWeight,
      overWeightLimit: result.overWeightLimit,
      tapeRequired:    result.tapeRequired,
      goalWeight:      existing?.goalWeight,
      weeklyGoalLbs:   existing?.weeklyGoalLbs,
      weightLog:       existing?.weightLog ?? [],
      assessmentHistory: existing?.assessmentHistory ?? [],
    };

    return pushAssessmentHistory(base, {
      date:             now,
      weight:           Number(inputs.weightLbs),
      neckInches:       Number(inputs.neckInches),
      waistInches:      Number(inputs.waistInches),
      hipInches:        inputs.hipInches ? Number(inputs.hipInches) : undefined,
      pftScore:         Number(inputs.pftScore),
      cftScore:         Number(inputs.cftScore),
      estimatedBodyFat: result.estimatedBodyFat,
      riskLevel:        result.riskLevel,
      passFailStatus:   result.passFailStatus,
    });
  };

  // ── Save ─────────────────────────────────────────────────────────────────

  const doSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const id = activeProfileId ?? newProfileId();
      const profile = await buildProfile(id, fields);
      await apiUpsertProfile(profile);
      setActiveProfileId(id);
      onSaved(id, profile.name);
      setSaved(true);
      setShowForm(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setSaving(false);
    }
  };

  // ── Open form ─────────────────────────────────────────────────────────────

  const handleClick = async () => {
    if (isUpdate) {
      // Pre-fill from existing profile
      const profiles = await apiGetProfiles();
      const existing = profiles.find((p) => p.id === activeProfileId);
      setFields({
        rank:       existing?.rank       ?? "Cpl",
        firstName:  existing?.firstName  ?? "",
        middleName: existing?.middleName ?? "",
        lastName:   existing?.lastName   ?? "",
      });
    } else {
      setFields(DEFAULT_NAME);
    }
    setShowForm(true);
  };

  // ── Saved confirmation ────────────────────────────────────────────────────

  if (saved) {
    return (
      <div className="flex items-center justify-center gap-2 h-10 text-primary text-xs font-bold uppercase tracking-widest">
        <CheckCircle2 className="w-4 h-4" />
        Profile Saved
      </div>
    );
  }

  // ── Name form ─────────────────────────────────────────────────────────────

  if (showForm) {
    return (
      <div className="flex flex-col gap-3 border border-border rounded-md px-4 py-4 bg-card">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          Marine Identification
        </p>

        {/* Rank */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Rank</Label>
          <select
            value={fields.rank}
            onChange={set("rank")}
            className="h-10 w-full rounded-md border border-input bg-card px-3 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <optgroup label="Enlisted">
              {ENLISTED.map((r) => <option key={r} value={r}>{r}</option>)}
            </optgroup>
            <optgroup label="Warrant Officer">
              {WARRANT.map((r) => <option key={r} value={r}>{r}</option>)}
            </optgroup>
            <optgroup label="Officer">
              {OFFICER.map((r) => <option key={r} value={r}>{r}</option>)}
            </optgroup>
          </select>
        </div>

        {/* First / Middle name */}
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={fields.firstName}
              onChange={set("firstName")}
              placeholder="First"
              autoFocus
              className="bg-background font-mono text-sm h-10"
            />
          </div>
          <div className="flex flex-col gap-1.5" style={{ width: "90px" }}>
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              Middle <span className="text-destructive">*</span>
            </Label>
            <Input
              value={fields.middleName}
              onChange={set("middleName")}
              placeholder="Middle"
              className="bg-background font-mono text-sm h-10"
            />
          </div>
        </div>

        {/* Last name */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            Last Name <span className="text-destructive">*</span>
          </Label>
          <Input
            value={fields.lastName}
            onChange={set("lastName")}
            placeholder="Last"
            className="bg-background font-mono text-sm h-10"
          />
        </div>

        {/* Live preview */}
        <div className="border border-border/50 rounded-md px-3 py-2 bg-muted/20 min-h-[40px] flex items-center">
          {preview ? (
            <p className="text-sm font-mono font-bold text-foreground">{preview}</p>
          ) : (
            <p className="text-xs text-muted-foreground/60 font-mono">
              Rank LastName, F M
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            type="button"
            className="flex-1 h-10 uppercase tracking-widest text-xs font-bold"
            disabled={saving || !canSave}
            onClick={doSave}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isUpdate ? "Update Profile" : "Save Profile"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 px-3 text-xs text-muted-foreground"
            onClick={() => setShowForm(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // ── Default button ────────────────────────────────────────────────────────

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full h-10 uppercase tracking-widest text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 gap-2"
      disabled={saving}
      onClick={handleClick}
    >
      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <User className="w-3.5 h-3.5" />}
      {isUpdate ? "Update Profile" : "Save This Assessment"}
    </Button>
  );
}

// ── Load Panel ────────────────────────────────────────────────────────────────

export function LoadProfilePanel({ onLoad, activeProfileId }: LoadPanelProps) {
  const [open, setOpen]         = useState(false);
  const [profiles, setProfiles] = useState<MarineProfile[]>([]);
  const [loading, setLoading]   = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      setProfiles(await apiGetProfiles());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await apiDeleteProfile(id);
    if (id === getActiveProfileId()) setActiveProfileId(null);
    await refresh();
  };

  if (profiles.length === 0 && !loading) return null;

  const riskColor = (r: string) =>
    r === "In Regs" ? "text-primary" : r === "Watch Zone" ? "text-yellow-600" : "text-destructive";

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const profileWord = profiles.length === 1 ? "saved profile" : "saved profiles";

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.92)",
        boxShadow: "0 2px 12px rgba(15,31,60,0.08), 0 1px 3px rgba(15,31,60,0.06)",
      }}
    >
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open) refresh(); }}
        className="w-full flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-blue-50/60"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)" }}
          >
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col items-start gap-0">
            <span className="text-sm font-bold text-foreground leading-tight">
              {profiles.length} {profileWord}
            </span>
            <span className="text-[10px] uppercase tracking-widest" style={{ color: "#64748b" }}>
              Tap to load
            </span>
          </div>
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />}
        </div>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: open ? "#eff6ff" : "#f1f5f9" }}
        >
          {open ? (
            <ChevronUp className="w-4 h-4 text-blue-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </button>

      {open && (
        <div className="flex flex-col" style={{ borderTop: "1px solid #e2e8f0" }}>
          {profiles.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center justify-between px-4 py-3.5 gap-3 cursor-pointer transition-colors hover:bg-blue-50/40"
              style={{
                borderTop: i > 0 ? "1px solid #f1f5f9" : undefined,
                background: p.id === activeProfileId ? "rgba(37,99,235,0.04)" : undefined,
              }}
              onClick={() => { onLoad(p); setOpen(false); }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-[11px] font-bold uppercase"
                  style={{
                    background: p.id === activeProfileId ? "#dbeafe" : "#f1f5f9",
                    color: p.id === activeProfileId ? "#1d4ed8" : "#64748b",
                  }}
                >
                  {p.lastName?.[0] ?? p.name[0]}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-mono font-bold text-foreground truncate">{p.name}</p>
                    {p.id === activeProfileId && (
                      <span
                        className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: "#dbeafe", color: "#1d4ed8" }}
                      >
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[10px]" style={{ color: "#64748b" }}>
                    {fmtDate(p.updatedAt)} · {p.weightLbs} lbs ·{" "}
                    <span className={riskColor(p.riskLevel)}>{p.riskLevel}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => handleDelete(p.id, e)}
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50"
                style={{ color: "#94a3b8" }}
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
