"use client";

import { FormEvent, useState } from "react";

type TestResult = {
  ok?: boolean;
  reference?: string;
  sent?: string[];
  error?: string;
};

export function EmailTestForm() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<TestResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch("/api/test/email", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const data = await response.json() as TestResult;
      setResult(response.ok ? data : { ...data, ok: false });
    } catch {
      setResult({ ok: false, error: "Could not reach the email test endpoint." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-6">
      <div>
        <label htmlFor="token" className="block text-sm font-semibold text-[#464248]">
          Test token
        </label>
        <input
          id="token"
          name="token"
          type="password"
          required
          autoComplete="off"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="EMAIL_TEST_TOKEN"
          className="mt-2 min-h-12 w-full rounded-xl border border-[#d8c9aa] bg-white px-4 text-base text-[#464248] outline-none transition focus:border-[#718d7f] focus:ring-2 focus:ring-[#718d7f]/20"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="min-h-12 w-full rounded-xl bg-[#718d7f] px-5 font-semibold text-white transition hover:bg-[#5e796c] disabled:cursor-wait disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Send both test emails"}
      </button>

      {result ? (
        <div
          role="status"
          className={`rounded-xl border p-4 text-sm leading-6 ${
            result.ok
              ? "border-[#aac2b6] bg-[#edf5f1] text-[#365247]"
              : "border-[#e2b9b4] bg-[#fff1ef] text-[#8a342c]"
          }`}
        >
          {result.ok ? (
            <>
              <strong className="block">Both emails were accepted by SMTP.</strong>
              <span>Reference: {result.reference}</span>
              <span className="block">Sent: {result.sent?.join(", ")}</span>
            </>
          ) : (
            <>
              <strong className="block">Test failed.</strong>
              <span>{result.error ?? "Unknown error"}</span>
              {result.reference ? <span className="block">Reference: {result.reference}</span> : null}
              {result.sent?.length ? <span className="block">Sent before failure: {result.sent.join(", ")}</span> : null}
            </>
          )}
        </div>
      ) : null}
    </form>
  );
}
