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
        <h1 className="font-kalnia text-3xl text-[#464248]">Email delivery test</h1>
        <p className="mt-4 text-sm leading-6 text-[#6f696f]">
          Send both order email templates to the configured test inbox using Cloudflare Email Sending.
        </p>
        <EmailTestForm />
      </section>
    </main>
  );
}
