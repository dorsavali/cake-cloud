import { methodNotAllowed, notFound } from "../http/json.js";
import {
  renderCustomerOrderEmail,
  renderInternalOrderEmail,
  type OrderEmailData,
} from "../email/order-templates.js";
import type { ApiEnv } from "../types/env.js";

const previewAddresses = {
  hello: "customer-orders@example.invalid",
  orders: "internal-orders@example.invalid",
} as const;

const sampleOrder: OrderEmailData = {
  orderNumber: "CC-1048",
  orderType: "Daily Menu",
  customerName: "Sophie Taylor",
  customerEmail: "sophie@example.com",
  customerPhone: "+61 412 345 678",
  pickup: "Saturday, 14 November 2026 · 10:30 AM",
  currency: "AUD",
  total: 6850,
  items: [
    {
      name: "Raspberry Cloud Cake",
      details: "Regular · Vanilla sponge · Raspberry filling",
      quantity: 1,
      total: 5200,
    },
    {
      name: "Babyccino",
      details: "Warm · Cinnamon dust",
      quantity: 2,
      total: 900,
    },
    {
      name: "Almond Croissant",
      quantity: 1,
      total: 750,
    },
  ],
  notes: "Please write ‘Happy Birthday Mia’ on the cake box.",
};

export function handleEmailPreview(
  request: Request,
  kind: string,
  env: ApiEnv,
): Response {
  if (request.method !== "GET") return methodNotAllowed();
  if (env.EMAIL_PREVIEW_ENABLED !== "true") return notFound();

  const email = kind === "customer"
    ? renderCustomerOrderEmail(sampleOrder, previewAddresses)
    : kind === "internal"
      ? renderInternalOrderEmail(sampleOrder, previewAddresses)
      : null;

  if (!email) return notFound();

  return new Response(email.html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; base-uri 'none'; form-action 'none'",
    },
  });
}
