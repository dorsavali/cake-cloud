"use client";
import { useRef, useState, type SetStateAction } from "react";
import { readDraft, writeDraft } from "./draft-storage";

// Used within the client-mounted cake flow so server HTML never reads storage.
export function useDraftState<T>(key: string, fallback: T, valid: (value: unknown) => value is T) {
  const [value, setValue] = useState<T>(() => readDraft(key, fallback, valid));
  const current = useRef(value);
  function update(action: SetStateAction<T>) {
    const next = typeof action === "function" ? (action as (previous: T) => T)(current.current) : action;
    current.current = next;
    writeDraft(key, next);
    setValue(next);
  }
  return [value, update] as const;
}
