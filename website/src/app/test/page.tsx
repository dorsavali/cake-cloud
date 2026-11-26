import type { Metadata } from "next";

import { EmailTestForm } from "./EmailTestForm";

export const metadata: Metadata = {
  title: "Email Delivery Test",
  robots: { index: false, follow: false },
};

export default function EmailTestPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f3eee5] px-4 py-12">
      <section className="w-full max-w-xl rounded-3xl border border-[#d8c9aa] bg-[#faf7f0] p-6 shadow-[0_16px_50px_rgba(70,66,72,0.12)] sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#718d7f]">Cake Cloud diagnostics</p>
        <h1 className="mt-3 font-kalnia text-3xl text-[#464248]">Email delivery test</h1>
        <p className="mt-4 text-sm leading-6 text-[#6f696f]">
          This sends exactly two messages through the isolated Libre Mobile OS SMTP test configuration. Both messages are delivered to dorsa@libremobileos.com.
        </p>
        <div className="mt-5 rounded-xl border border-[#e1d4bd] bg-white/70 p-4 text-xs leading-5 text-[#6f696f]">
          No order, payment, or R2 record is created. The token is sent only in the authorization header and is not stored by this page.
        </div>
        <EmailTestForm />
      </section>
    </main>
  );
}
