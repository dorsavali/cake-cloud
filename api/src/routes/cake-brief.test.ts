import { test } from "node:test";
import assert from "node:assert/strict";
import { handleCakeBrief } from "./cake-brief.js";
import type { ApiEnv } from "../types/env.js";

function environment(objects = new Map<string, string | ArrayBuffer>()) {
  const env: ApiEnv = {
    WEBSITE_ORIGIN: "https://cake.example.com",
    SQUARE_ACCESS_TOKEN: "", SQUARE_APPLICATION_ID: "", SQUARE_ENVIRONMENT: "sandbox",
    SQUARE_WEBHOOK_SIGNATURE_KEY: "", SQUARE_WEBHOOK_NOTIFICATION_URL: "",
    CAKE_BRIEFS: {
      async put(key, value) { objects.set(key, value as string | ArrayBuffer); },
      async delete(keys) { for (const key of typeof keys === "string" ? [keys] : keys) objects.delete(key); },
    },
  };
  return { env, objects };
}

function validForm() {
  const form = new FormData();
  form.set("description", "A two-tier birthday cake");
  form.set("inspiration", "Sage and ivory");
  form.set("pickupDate", new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
  form.set("name", "Customer");
  form.set("email", "CUSTOMER@example.com");
  form.set("phone", "+61 400 000 000");
  form.set("website", "");
  return form;
}

test("stores the brief and a valid reference image in R2", async () => {
  const { env, objects } = environment();
  const form = validForm();
  const jpeg = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "cake.jpg", { type: "image/jpeg" });
  form.append("images", jpeg);
  const response = await handleCakeBrief(new Request("https://cake.example.com/api/cake/brief", {
    method: "POST", headers: { origin: "https://cake.example.com" }, body: form,
  }), env);
  assert.equal(response.status, 201);
  const result = await response.json() as { reference: string };
  const record = JSON.parse(objects.get("briefs/" + result.reference + "/brief.json") as string);
  assert.equal(record.email, "customer@example.com");
  assert.equal(record.images.length, 1);
  assert.ok(objects.has(record.images[0]));
});

test("rejects spoofed image content and removes partial uploads", async () => {
  const { env, objects } = environment();
  const form = validForm();
  form.append("images", new File(["not an image"], "fake.jpg", { type: "image/jpeg" }));
  const response = await handleCakeBrief(new Request("https://cake.example.com/api/cake/brief", {
    method: "POST", headers: { origin: "https://cake.example.com" }, body: form,
  }), env);
  assert.equal(response.status, 400);
  assert.equal(objects.size, 0);
});

test("rejects requests from another site", async () => {
  const { env } = environment();
  const response = await handleCakeBrief(new Request("https://cake.example.com/api/cake/brief", {
    method: "POST", headers: { origin: "https://attacker.example" }, body: validForm(),
  }), env);
  assert.equal(response.status, 403);
});
