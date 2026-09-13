import { json, methodNotAllowed } from "../http/json.js";
import type { ApiEnv } from "../types/env.js";

const maxFileBytes = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function field(form: FormData, name: string, max: number, required = false) {
  const value = form.get(name);
  if (typeof value !== "string") {
    if (required) throw new Error(`Missing ${name}.`);
    return "";
  }
  const clean = value.trim();
  if ((required && !clean) || clean.length > max) throw new Error(`Invalid ${name}.`);
  return clean;
}

function validImageHeader(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
}

export async function handleHostEnquiry(request: Request, env: ApiEnv): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed();
  if (!env.CAKE_BRIEFS) return json({ error: "Enquiry storage is not configured." }, 503);
  const origin = request.headers.get("origin");
  if (origin && env.WEBSITE_ORIGIN && origin !== new URL(env.WEBSITE_ORIGIN).origin) return json({ error: "Invalid request origin." }, 403);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxFileBytes + 100_000) return json({ error: "Upload is too large." }, 413);

  const stored: string[] = [];
  try {
    const form = await request.formData();
    if (field(form, "website", 1)) return json({ received: true });
    const fullName = field(form, "fullName", 100, true);
    const email = field(form, "email", 254, true).toLowerCase();
    const phone = field(form, "phone", 30, true);
    const preferredDate = field(form, "preferredDate", 10, true);
    const notes = field(form, "notes", 2000);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email.");
    if (!/^[+()\d\s.-]{7,30}$/.test(phone)) throw new Error("Enter a valid phone number.");
    if (form.get("termsAccepted") !== "true") throw new Error("Accept the terms and conditions.");
    const date = new Date(`${preferredDate}T00:00:00Z`);
    const tomorrow = new Date();
    tomorrow.setUTCHours(0, 0, 0, 0);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) || date.toISOString().slice(0, 10) !== preferredDate || date < tomorrow) throw new Error("Choose a future preferred date.");

    const id = crypto.randomUUID();
    const logo = form.get("logo");
    let logoKey: string | null = null;
    if (logo instanceof File && logo.size > 0) {
      if (logo.size > maxFileBytes || !allowedTypes.has(logo.type)) throw new Error("Logo must be JPG, PNG, or WebP and no larger than 5 MB.");
      const bytes = new Uint8Array(await logo.arrayBuffer());
      if (!validImageHeader(logo.type, bytes)) throw new Error("The uploaded logo is invalid.");
      const extension = logo.type === "image/jpeg" ? "jpg" : logo.type.split("/")[1];
      logoKey = `host-enquiries/${id}/logo.${extension}`;
      await env.CAKE_BRIEFS.put(logoKey, bytes.buffer, { httpMetadata: { contentType: logo.type }, customMetadata: { originalName: logo.name.slice(0, 200) } });
      stored.push(logoKey);
    }

    const record = {
      id,
      type: "complex-hosting-enquiry",
      fullName,
      email,
      phone,
      preferredDate,
      notes,
      logoKey,
      submittedAt: new Date().toISOString(),
      status: "new",
      notification: { status: "pending_configuration", recipient: null },
    };
    const recordKey = `host-enquiries/${id}/enquiry.json`;
    await env.CAKE_BRIEFS.put(recordKey, JSON.stringify(record), { httpMetadata: { contentType: "application/json" } });
    stored.push(recordKey);
    return json({ received: true, reference: id }, 201);
  } catch (error) {
    if (stored.length) await env.CAKE_BRIEFS.delete(stored).catch(() => undefined);
    return json({ error: error instanceof Error ? error.message : "Could not submit enquiry." }, 400);
  }
}
