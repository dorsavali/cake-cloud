const prefix = "cake-draft-v1:";

export function readDraft<T>(key: string, fallback: T, valid: (value: unknown) => value is T): T {
  try {
    const raw = sessionStorage.getItem(prefix + key);
    if (raw === null) return fallback;
    const value: unknown = JSON.parse(raw);
    return valid(value) ? value : fallback;
  } catch { return fallback; }
}

export function writeDraft(key: string, value: unknown) {
  try { sessionStorage.setItem(prefix + key, JSON.stringify(value)); } catch { /* Storage may be disabled; keep the form usable. */ }
}

export function clearCakeDraft() {
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index--) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(prefix)) sessionStorage.removeItem(key);
    }
  } catch { /* Payment verification never depends on draft storage. */ }
}

export const draftText = (value: unknown): value is string => typeof value === "string" && value.length <= 254;
export const draftBoolean = (value: unknown): value is boolean => typeof value === "boolean";
export const draftIndex = (length: number) => (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value < length;
export const draftChoice = <T extends string>(choices: readonly T[]) => (value: unknown): value is T => typeof value === "string" && choices.includes(value as T);
