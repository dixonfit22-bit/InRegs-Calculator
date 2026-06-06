/**
 * storage.ts — localStorage persistence layer
 * All InRegs data lives under namespaced keys ("inregs_*").
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WeightEntry {
  id: string;
  date: string; // ISO 8601 date string
  weight: number;
  note?: string;
}

export interface MarineProfile {
  id: string;
  name: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  // Assessment inputs (mirrors FormData but typed)
  sex: string;
  age: string;
  heightInches: string;
  weightLbs: string;
  neckInches: string;
  waistInches: string;
  hipInches: string;
  pftScore: string;
  cftScore: string;
  // Assessment result snapshot
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
}

// ── Keys ──────────────────────────────────────────────────────────────────────

const PROFILES_KEY        = "inregs_profiles";
const ACTIVE_PROFILE_KEY  = "inregs_active_profile_id";

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

// ── Profiles CRUD ─────────────────────────────────────────────────────────────

export function loadProfiles(): MarineProfile[] {
  return read<MarineProfile[]>(PROFILES_KEY, []);
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

// ── Weight Log helpers ────────────────────────────────────────────────────────

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

export function updateProfileGoal(
  profileId: string,
  goalWeight: number,
  weeklyGoalLbs: number
): void {
  const profile = getProfile(profileId);
  if (!profile) return;
  upsertProfile({ ...profile, goalWeight, weeklyGoalLbs });
}

// ── ID factory ────────────────────────────────────────────────────────────────

export function newProfileId(): string {
  return crypto.randomUUID();
}
