import type { ApiEnv } from "../types/env.js";
import type { RenderedEmail } from "./order-templates.js";

type WorkerSocket = import("cloudflare:sockets").Socket;

const encoder = new TextEncoder();
const responseTimeoutMs = 15_000;

function required(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new Error(`${name} is not configured`);
  return value.trim();
}

function validAddress(value: string): boolean {
  return /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value) && !/[\r\n]/.test(value);
}

function base64(value: string): string {
  const bytes = encoder.encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function wrappedBase64(value: string): string {
  return base64(value).match(/.{1,76}/g)?.join("\r\n") ?? "";
}

function encodedHeader(value: string): string {
  if (/^[\x20-\x7e]*$/.test(value)) return value;
  return `=?UTF-8?B?${base64(value)}?=`;
}

function mailbox(value: string): { address: string; header: string } {
  const match = value.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
  const address = (match?.[2] ?? value).trim();
  if (!validAddress(address)) throw new Error("Invalid email address");
  const name = match?.[1]?.trim();
  return {
    address,
    header: name ? `${encodedHeader(name)} <${address}>` : address,
  };
}

export function emailSendingEnabled(env: ApiEnv): boolean {
  return env.EMAIL_ENABLED === "true";
}

export function buildMimeMessage(email: RenderedEmail): string {
  if (/[\r\n]/.test(email.subject)) throw new Error("Invalid email subject");
  const from = mailbox(email.from);
  const to = mailbox(email.to);
  const replyTo = mailbox(email.replyTo);
  const boundary = `cake-cloud-${crypto.randomUUID()}`;
  const messageId = `<${crypto.randomUUID()}@cake-cloud.com.au>`;

  return [
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    `From: ${from.header}`,
    `To: ${to.header}`,
    `Reply-To: ${replyTo.header}`,
    `Subject: ${encodedHeader(email.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrappedBase64(email.text),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrappedBase64(email.html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

class SmtpSession {
  private socket: WorkerSocket;
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private writer: WritableStreamDefaultWriter<Uint8Array>;
  private decoder = new TextDecoder();
  private buffer = "";

  constructor(socket: WorkerSocket) {
    this.socket = socket;
    this.reader = socket.readable.getReader();
    this.writer = socket.writable.getWriter();
  }

  private async timeout<T>(promise: Promise<T>): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("SMTP response timed out")), responseTimeoutMs);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  private async line(): Promise<string> {
    while (true) {
      const newline = this.buffer.indexOf("\n");
      if (newline >= 0) {
        const line = this.buffer.slice(0, newline).replace(/\r$/, "");
        this.buffer = this.buffer.slice(newline + 1);
        return line;
      }
      const result = await this.timeout(this.reader.read());
      if (result.done) throw new Error("SMTP connection closed unexpectedly");
      this.buffer += this.decoder.decode(result.value, { stream: true });
    }
  }

  async response(expected: number[]): Promise<string[]> {
    const lines: string[] = [];
    let code = 0;
    while (true) {
      const line = await this.line();
      lines.push(line);
      if (!/^\d{3}[ -]/.test(line)) continue;
      code = Number(line.slice(0, 3));
      if (line[3] === " ") break;
    }
    if (!expected.includes(code)) {
      throw new Error(`SMTP command failed (${code})`);
    }
    return lines;
  }

  async write(value: string): Promise<void> {
    await this.timeout(this.writer.write(encoder.encode(value)));
  }

  async command(value: string, expected: number[]): Promise<string[]> {
    await this.write(`${value}\r\n`);
    return this.response(expected);
  }

  async startTls(): Promise<void> {
    this.reader.releaseLock();
    this.writer.releaseLock();
    this.socket = this.socket.startTls();
    await this.timeout(this.socket.opened);
    this.reader = this.socket.readable.getReader();
    this.writer = this.socket.writable.getWriter();
    this.decoder = new TextDecoder();
    this.buffer = "";
  }

  async close(): Promise<void> {
    this.reader.releaseLock();
    this.writer.releaseLock();
    await this.socket.close();
  }
}

export async function sendEmailWithSmtp(
  env: ApiEnv,
  email: RenderedEmail,
): Promise<void> {
  if (!emailSendingEnabled(env)) return;

  const hostname = required(env.SMTP_HOST, "SMTP_HOST");
  const port = Number(env.SMTP_PORT ?? "587");
  const security = env.SMTP_SECURITY === "tls" ? "tls" : "starttls";
  if (!Number.isInteger(port) || port < 1 || port > 65535 || port === 25) {
    throw new Error("SMTP_PORT must be a valid non-25 port");
  }

  const from = mailbox(email.from);
  const to = mailbox(email.to);
  const helloUsername = required(env.SMTP_HELLO_USERNAME, "SMTP_HELLO_USERNAME");
  const isCustomerEmail = from.address.toLowerCase() === helloUsername.toLowerCase();
  const username = required(
    isCustomerEmail ? helloUsername : env.SMTP_ORDERS_USERNAME,
    isCustomerEmail ? "SMTP_HELLO_USERNAME" : "SMTP_ORDERS_USERNAME",
  );
  const password = required(
    isCustomerEmail ? env.SMTP_HELLO_PASSWORD : env.SMTP_ORDERS_PASSWORD,
    isCustomerEmail ? "SMTP_HELLO_PASSWORD" : "SMTP_ORDERS_PASSWORD",
  );
  const { connect } = await import("cloudflare:sockets");
  const socket = connect(
    { hostname, port },
    { secureTransport: security === "tls" ? "on" : "starttls" },
  );
  await socket.opened;
  const session = new SmtpSession(socket);

  try {
    await session.response([220]);
    await session.command("EHLO cake-cloud.com.au", [250]);
    if (security === "starttls") {
      await session.command("STARTTLS", [220]);
      await session.startTls();
      await session.command("EHLO cake-cloud.com.au", [250]);
    }
    await session.command("AUTH LOGIN", [334]);
    await session.command(base64(username), [334]);
    await session.command(base64(password), [235]);
    await session.command(`MAIL FROM:<${from.address}>`, [250]);
    await session.command(`RCPT TO:<${to.address}>`, [250, 251]);
    await session.command("DATA", [354]);
    const message = buildMimeMessage(email)
      .replace(/(^|\r\n)\./g, "$1..")
      .replace(/\r\n$/, "");
    await session.write(`${message}\r\n.\r\n`);
    await session.response([250]);
    await session.command("QUIT", [221]);
  } finally {
    await session.close().catch(() => undefined);
  }
}
