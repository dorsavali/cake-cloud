"use client";

import { type FormEvent, useState } from "react";

type TestResult = {
  ok?: boolean;
  reference?: string;
  accepted?: { template: string; messageId: string }[];
  code?: string;
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
        headers: { authorization: `Bearer ${token.trim()}` },
      });
      setResult(await response.json() as TestResult);
    } catch {
      setResult({ error: "Could not reach the email test endpoint." });
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
          type="password"
          required
          autoComplete="off"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border border-[#d8c9aa] bg-white px-4 text-[#464248]"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="min-h-12 w-full rounded-xl bg-[#5e796c] px-5 font-semibold text-white disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Send both test emails"}
      </button>
      {result && (
        <div role="status" className="space-y-2 break-words rounded-xl border border-[#d8c9aa] p-4 text-sm">
          <p className="font-semibold">
            {result.ok ? "Cloudflare accepted both emails. Check the inbox." : "Email test failed."}
          </p>
          {result.error && <p>{result.error} {result.code}</p>}
          {result.reference && <p>{result.reference}</p>}
          {result.accepted?.map(({ template, messageId }) => (
            <p key={template}>{template} · {messageId}</p>
          ))}
        </div>
      )}
    </form>
  );
}
