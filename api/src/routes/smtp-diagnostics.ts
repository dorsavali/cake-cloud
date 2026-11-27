import type { connect as connectSocket, Socket } from "cloudflare:sockets";
import { SmtpSession } from "../email/smtp.js";
import { json } from "../http/json.js";
import type { ApiEnv } from "../types/env.js";
import { checkEmailTestAccess } from "./email-test.js";

const targets = [
  { hostname: "mail.cake-cloud.com.au", port: 587, mode: "starttls" },
  { hostname: "221.121.158.145", port: 587, mode: "tcp" },
  { hostname: "mail.cake-cloud.com.au", port: 465, mode: "tls" },
  { hostname: "mail.libremobileos.com", port: 465, mode: "tls" },
] as const;

type Step = {
  name: string;
  status: "passed" | "failed" | "skipped";
  elapsedMs: number;
  detail: string;
};

async function withTimeout<T>(action: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      action(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Timed out after 5 seconds")), 5000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function probe(target: (typeof targets)[number], connect: typeof connectSocket) {
  const { hostname, port, mode } = target;
  const steps: Step[] = [];
  let socket: Socket | undefined;
  let session: SmtpSession | undefined;

  async function step(name: string, action: () => Promise<string>) {
    const start = Date.now();
    try {
      const detail = await withTimeout(action);
      steps.push({ name, status: "passed", elapsedMs: Date.now() - start, detail });
    } catch (error) {
      const detail = error instanceof Error ? error.message.slice(0, 240) : "Connection failed";
      steps.push({ name, status: "failed", elapsedMs: Date.now() - start, detail });
      throw error;
    }
  }

  try {
    await step(mode === "tls" ? "Socket open (TCP + implicit TLS)" : "TCP connect", async () => {
      socket = connect({ hostname, port }, {
        secureTransport: mode === "tls" ? "on" : mode === "starttls" ? "starttls" : "off",
      });
      void socket.closed.catch(() => undefined);
      const info = await socket.opened as { remoteAddress?: string } | undefined;
      return info?.remoteAddress ? `Peer ${info.remoteAddress}` : "Socket opened";
    });
    if (!socket) throw new Error("Socket unavailable");
    const smtp = session = new SmtpSession(socket);
    await step("SMTP greeting", async () => {
      await smtp.response([220]);
      return "SMTP 220";
    });
    await step("EHLO", async () => {
      const lines = await smtp.command("EHLO cake-cloud.com.au", [250]);
      const advertised = lines.some((line) => /^250[- ]STARTTLS(?:\s|$)/i.test(line));
      return `SMTP 250. STARTTLS advertised: ${advertised ? "yes" : "no"}`;
    });
    if (mode === "starttls") {
      await step("STARTTLS command", async () => {
        await smtp.command("STARTTLS", [220]);
        return "SMTP 220";
      });
      await step("TLS and encrypted EHLO", async () => {
        await smtp.startTls();
        await smtp.command("EHLO cake-cloud.com.au", [250]);
        return "SMTP 250 over TLS";
      });
    }
    if (mode === "tcp") {
      steps.push({
        name: "TLS", status: "skipped", elapsedMs: 0,
        detail: "Direct-IP comparison ends after EHLO. TLS is checked on the hostname.",
      });
    }
  } catch {
    // The failed step already contains the diagnostic details.
  } finally {
    const closing = session ? session.close() : socket?.close();
    void closing?.catch(() => undefined);
  }
  return { hostname, port, mode, steps };
}

export async function handleSmtpDiagnostics(
  request: Request,
  env: ApiEnv,
  loadConnect = async () => (await import("cloudflare:sockets")).connect,
): Promise<Response> {
  const denied = await checkEmailTestAccess(request, env);
  if (denied) return denied;

  const connect = await loadConnect();
  const reference = `SMTP-DIAG-${crypto.randomUUID()}`;
  const cf = (request as Request & { cf?: { colo?: string } }).cf;
  const context = {
    reference,
    startedAt: new Date().toISOString(),
    rayId: request.headers.get("cf-ray"),
    ingressColo: cf?.colo ?? null,
    workerVersion: env.CF_VERSION_METADATA?.id ?? null,
  };
  console.info("[smtp-diagnostics] Started", context);
  const results = await Promise.all(targets.map(async (target) => {
    const result = await probe(target, connect);
    const log = result.steps.some((stage) => stage.status === "failed") ? "warn" : "info";
    console[log]("[smtp-diagnostics] Target result", { ...context, ...result });
    return result;
  }));
  return json({ ...context, results });
}
