import { test } from "node:test";
import assert from "node:assert/strict";
import { readDraft, writeDraft, clearCakeDraft, draftText, draftIndex, draftChoice } from "../src/components/custom-cakes/draft-storage.ts";

function storage(t) {
  const values = new Map();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
    key: index => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  } });
  t.after(() => previous ? Object.defineProperty(globalThis, "sessionStorage", previous) : delete globalThis.sessionStorage);
  return values;
}

test("draft values survive a fresh read after reload", t => {
  storage(t);
  writeDraft("date", "10/10/2026");
  writeDraft("size", 2);
  assert.equal(readDraft("date", "", draftText), "10/10/2026");
  assert.equal(readDraft("size", 0, draftIndex(4)), 2);
});
test("corrupt or out-of-range drafts fall back safely", t => {
  const values = storage(t);
  values.set("cake-draft-v1:size", "99");
  values.set("cake-draft-v1:date", "{broken");
  assert.equal(readDraft("size", 0, draftIndex(4)), 0);
  assert.equal(readDraft("date", "", draftText), "");
  writeDraft("sponge", "Injected option");
  assert.equal(readDraft("sponge", "Vanilla", draftChoice(["Vanilla", "Chocolate"])), "Vanilla");
});
test("blocked storage does not break editing or payment cleanup", t => {
  storage(t);
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, get() { throw new Error("Storage blocked"); } });
  assert.doesNotThrow(() => writeDraft("name", "Customer"));
  assert.equal(readDraft("name", "", draftText), "");
  assert.doesNotThrow(clearCakeDraft);
});
test("successful payment cleanup removes only cake draft", t => {
  const values = storage(t);
  values.set("unrelated", "keep");
  writeDraft("name", "Customer");
  writeDraft("paymentStep", true);
  clearCakeDraft();
  assert.deepEqual([...values], [["unrelated", "keep"]]);
});
