/**
 * storage.ts — localStorage persistence layer
 * All InRegs data lives under namespaced keys ("inregs_*").
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AssessmentHistoryEntry {
  id: string;
  date: string; // ISO 8601
  weight: number;
  neckInches: number;
  waistInches: number;
  hipInches?: number;
  pftScore: number;
  cftScore: number;
  estimatedBodyFat: number;
  riskLevel: "In Regs" | "Watch Zone" | "Out of Regs";
  passFailStatus: "PASS" | "FAIL";
}

export interface WeightEntry {
  id: string;
  date: string; // ISO 8601 date string
  weight: number;
  note?: string;
}

export interface MarineProfile {
  id: string;
  name: string;       // generated display name: "Rank LastName, FI [MI]"
  rank?: string;      // e.g. "Sgt", "Cpl", "SSgt"
  firstName?: string;
  middleName?: string;
  lastName?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  // Assessment inputs
  sex: string;
  age: string;
  heightInches: string;
  weightLbs: string;
  neckInches: string;
  waistInches: string;
  hipInches: string;
  pftScore: string;
  cftScore: string;
  // Latest assessment result snapshot
  riskLevel: "In Regs" | "Watch Zone" | "Out of Regs";
  passFailStatus: "PASS" | "FAIL";
  estimatedBodyFat: number;
  effectiveMaxBodyFat: number;
  maxAllowableWeight: number;
  overWeightLimit: boolean;
  tapeRequired: boolean;
  // Progress tracking
  goalWeight?: number;
  weeklyGoalLbs?: number;
  weightLog: WeightEntry[];
  // Assessment history (one entry per save/update)
  assessmentHistory: AssessmentHistoryEntry[];
}

// ── Keys ──────────────────────────────────────────────────────────────────────

const PROFILES_KEY       = "inregs_profiles";
const ACTIVE_PROFILE_KEY = "inregs_active_profile_id";

// ── Helpers ───────────────────────────────────────────────────────────────────

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function store(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota exceeded — silently skip
  }
}

/** Ensure legacy profiles have all required fields */
function migrateProfile(p: Partial<MarineProfile>): MarineProfile {
  return {
    ...(p as MarineProfile),
    weightLog: p.weightLog ?? [],
    assessmentHistory: p.assessmentHistory ?? [],
  };
}

// ── Profiles CRUD ─────────────────────────────────────────────────────────────

export function loadProfiles(): MarineProfile[] {
  return read<Partial<MarineProfile>[]>(PROFILES_KEY, []).map(migrateProfile);
}

export function getProfile(id: string): MarineProfile | null {
  return loadProfiles().find((p) => p.id === id) ?? null;
}

export function upsertProfile(profile: MarineProfile): void {
  const profiles = loadProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  const now = new Date().toISOString();
  const updated = { ...profile, updatedAt: now };
  if (idx >= 0) {
    profiles[idx] = updated;
  } else {
    profiles.push(updated);
  }
  store(PROFILES_KEY, profiles);
}

export function deleteProfile(id: string): void {
  store(PROFILES_KEY, loadProfiles().filter((p) => p.id !== id));
}

// ── Active Profile ────────────────────────────────────────────────────────────

export function getActiveProfileId(): string | null {
  return localStorage.getItem(ACTIVE_PROFILE_KEY);
}

export function setActiveProfileId(id: string | null): void {
  if (id) {
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }
}

// ── Weight Log ────────────────────────────────────────────────────────────────

export function addWeightEntry(profileId: string, entry: Omit<WeightEntry, "id">): void {
  const profile = getProfile(profileId);
  if (!profile) return;
  const newEntry: WeightEntry = { ...entry, id: crypto.randomUUID() };
  const log = [...profile.weightLog, newEntry].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  upsertProfile({ ...profile, weightLog: log });
}

export function removeWeightEntry(profileId: string, entryId: string): void {
  const profile = getProfile(profileId);
  if (!profile) return;
  upsertProfile({ ...profile, weightLog: profile.weightLog.filter((e) => e.id !== entryId) });
}

export function updateProfileGoal(profileId: string, goalWeight: number, weeklyGoalLbs: number): void {
  const profile = getProfile(profileId);
  if (!profile) return;
  upsertProfile({ ...profile, goalWeight, weeklyGoalLbs });
}

// ── Assessment History ────────────────────────────────────────────────────────

export function pushAssessmentHistory(
  profile: MarineProfile,
  entry: Omit<AssessmentHistoryEntry, "id">
): MarineProfile {
  const last = profile.assessmentHistory.at(-1);
  // Avoid exact-duplicate entries (same weight + BF on same date)
  const today = new Date().toISOString().slice(0, 10);
  if (
    last &&
    last.date.startsWith(today) &&
    last.weight === entry.weight &&
    last.estimatedBodyFat === entry.estimatedBodyFat
  ) {
    return profile; // skip duplicate
  }
  const newEntry: AssessmentHistoryEntry = { ...entry, id: crypto.randomUUID() };
  return { ...profile, assessmentHistory: [...profile.assessmentHistory, newEntry] };
}

// ── Trend ─────────────────────────────────────────────────────────────────────

export type TrendDirection = "Improving" | "Worsening" | "Stable";

export function computeTrend(profile: MarineProfile): TrendDirection | null {
  const h = profile.assessmentHistory;
  if (h.length < 2) return null;
  const sorted = [...h].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const latest = sorted.at(-1)!.estimatedBodyFat;
  const prev   = sorted.at(-2)!.estimatedBodyFat;
  if (latest < prev) return "Improving";
  if (latest > prev) return "Worsening";
  return "Stable";
}

// ── ID factory ────────────────────────────────────────────────────────────────

export function newProfileId(): string {
  return crypto.randomUUID();
}

// ── Display name ──────────────────────────────────────────────────────────────

/**
 * Generates the standard military display name.
 * Format: "Rank LastName, FirstInitial [MiddleInitial]"
 * Examples: "Sgt Dixon, C M" | "Cpl Jones, T"
 */
export function buildDisplayName(
  rank: string,
  lastName: string,
  firstName: string,
  middleName?: string,
): string {
  const f = firstName.trim().charAt(0).toUpperCase();
  const m = middleName?.trim().charAt(0).toUpperCase();
  const base = `${rank.trim()} ${lastName.trim()}, ${f}`;
  return m ? `${base} ${m}` : base;
}
