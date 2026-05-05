const STORAGE_KEY = "derma-route:lastSuccessfulPhone:v1";
const LEGACY_STORAGE_KEY = "derma-route:recentPhones:v1";

function normalizePhoneE164(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
}

export function getLastSuccessfulPhone(): string | null {
  if (typeof window === "undefined") return null;

  // One-time migration from the legacy list-based storage.
  if (!window.localStorage.getItem(STORAGE_KEY)) {
    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      try {
        const parsed = JSON.parse(legacyRaw) as unknown;
        const first =
          Array.isArray(parsed) && typeof parsed[0] === "string"
            ? parsed[0]
            : null;
        const normalized = first ? normalizePhoneE164(first) : "";
        if (normalized) {
          window.localStorage.setItem(STORAGE_KEY, normalized);
        }
      } catch {
        // ignore
      } finally {
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const normalized = normalizePhoneE164(raw);
  return normalized || null;
}

// Backwards-compatible name: now stores only the single last successful phone.
export function addRecentPhone(phone: string) {
  if (typeof window === "undefined") return;
  const normalized = normalizePhoneE164(phone);
  if (!normalized) return;

  window.localStorage.setItem(STORAGE_KEY, normalized);
}

// Optional compatibility export (returns at most 1).
export function getRecentPhones(): string[] {
  const last = getLastSuccessfulPhone();
  return last ? [last] : [];
}
