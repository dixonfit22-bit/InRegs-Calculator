/**
 * API client — syncs MarineProfiles with the backend PostgreSQL store.
 * Falls back gracefully when the server is unreachable.
 */
import { MarineProfile } from "./storage";

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
}

export async function apiGetProfiles(): Promise<MarineProfile[]> {
  try {
    const res = await apiFetch("/api/profiles");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return [];
  }
}

export async function apiUpsertProfile(profile: MarineProfile): Promise<MarineProfile> {
  const res = await apiFetch("/api/profiles", {
    method: "POST",
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error(`Failed to save profile: HTTP ${res.status}`);
  return res.json();
}

export async function apiDeleteProfile(id: string): Promise<void> {
  const res = await apiFetch(`/api/profiles/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete profile: HTTP ${res.status}`);
}
