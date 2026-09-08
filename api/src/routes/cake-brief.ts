import { json, methodNotAllowed } from "../http/json.js";
import type { ApiEnv } from "../types/env.js";

const maxFiles = 3;
const maxFileBytes = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function field(form: FormData, name: string, max: number, required = false) {
  const value = form.get(name);
  if (typeof value !== "string") {
    if (required) throw new Error("Missing " + name);
    return "";
  }
  const clean = value.trim();
  if ((required && !clean) || clean.length > max) throw new Error("Invalid " + name);
  return clean;
}

function validImageHeader(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
}

export async function handleCakeBrief(request: Request, env: ApiEnv): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed();
  if (!env.CAKE_BRIEFS) return json({ error: "Brief uploads are not configured." }, 503);
  const origin = request.headers.get("origin");
  if (origin && env.WEBSITE_ORIGIN && origin !== new URL(env.WEBSITE_ORIGIN).origin) return json({ error: "Invalid request origin." }, 403);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxFiles * maxFileBytes + 100_000) return json({ error: "Upload is too large." }, 413);

  const stored: string[] = [];
  try {
    const form = await request.formData();
    if (field(form, "website", 1)) return json({ received: true });
    const description = field(form, "description", 2000, true);
    const inspiration = field(form, "inspiration", 1000);
    const pickupDate = field(form, "pickupDate", 10, true);
    const name = field(form, "name", 100, true);
    const email = field(form, "email", 254, true).toLowerCase();
    const phone = field(form, "phone", 30, true);
    const pickup = new Date(pickupDate + "T00:00:00Z");
    const tomorrow = new Date();
    tomorrow.setUTCHours(0, 0, 0, 0);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate) || pickup.toISOString().slice(0, 10) !== pickupDate || pickup < tomorrow) throw new Error("Choose a future pickup date");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email");
    if (!/^[+()\d\s.-]{7,30}$/.test(phone)) throw new Error("Invalid phone");

    const files = form.getAll("images").filter((item): item is File => item instanceof File && item.size > 0);
    if (files.length > maxFiles) throw new Error("Upload up to " + maxFiles + " images");
    const id = crypto.randomUUID();
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      if (file.size > maxFileBytes || !allowedTypes.has(file.type)) throw new Error("Images must be JPG, PNG, or WebP and no larger than 5 MB each");
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!validImageHeader(file.type, bytes)) throw new Error("An uploaded image is invalid");
      const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      const key = "briefs/" + id + "/reference-" + (index + 1) + "." + extension;
      await env.CAKE_BRIEFS.put(key, bytes.buffer, { httpMetadata: { contentType: file.type }, customMetadata: { originalName: file.name.slice(0, 200) } });
      stored.push(key);
    }
    const record = { id, description, inspiration, pickupDate, name, email, phone, images: [...stored], submittedAt: new Date().toISOString(), status: "new" };
    const recordKey = "briefs/" + id + "/brief.json";
    await env.CAKE_BRIEFS.put(recordKey, JSON.stringify(record), { httpMetadata: { contentType: "application/json" } });
    stored.push(recordKey);
    return json({ received: true, reference: id }, 201);
  } catch (error) {
    if (stored.length) await env.CAKE_BRIEFS.delete(stored).catch(() => undefined);
    return json({ error: error instanceof Error ? error.message : "Could not submit brief." }, 400);
  }
}
