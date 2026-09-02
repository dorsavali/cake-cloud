import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { handleApiRequest, type ApiEnv } from "./handler.js";

const port = Number.parseInt(process.env.PORT ?? "3001", 10);
const hostname = process.env.HOST ?? "127.0.0.1";
const websiteOrigin = process.env.WEBSITE_ORIGIN ?? "http://localhost:3000";

const env: ApiEnv = {
  SQUARE_ACCESS_TOKEN: process.env.SQUARE_ACCESS_TOKEN ?? "",
  SQUARE_APPLICATION_ID: process.env.SQUARE_APPLICATION_ID ?? "",
  SQUARE_ENVIRONMENT:
    process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox",
};

async function toRequest(request: IncomingMessage): Promise<Request> {
  const origin = `http://${request.headers.host ?? `${hostname}:${port}`}`;
  const headers = new Headers();

  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  const chunks: Buffer[] = [];
  if (request.method !== "GET" && request.method !== "HEAD") {
    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
  }

  return new Request(new URL(request.url ?? "/", origin), {
    method: request.method,
    headers,
    body: chunks.length > 0 ? Buffer.concat(chunks) : undefined,
  });
}

async function sendResponse(
  response: Response,
  serverResponse: ServerResponse,
): Promise<void> {
  serverResponse.writeHead(response.status, Object.fromEntries(response.headers));
  serverResponse.end(Buffer.from(await response.arrayBuffer()));
}

function withCors(request: Request, response: Response): Response {
  if (request.headers.get("origin") !== websiteOrigin) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", websiteOrigin);
  headers.set("vary", "Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const server = createServer(async (incoming, outgoing) => {
  try {
    const request = await toRequest(incoming);
    const url = new URL(request.url);
    const isApiRoute = url.pathname === "/api" || url.pathname.startsWith("/api/");
    const response =
      request.method === "OPTIONS" && isApiRoute
        ? new Response(null, {
            status: 204,
            headers: {
              "access-control-allow-headers": "content-type",
              "access-control-allow-methods": "GET, POST, OPTIONS",
            },
          })
        : ((await handleApiRequest(request, env)) ??
          Response.json({ error: "Not found" }, { status: 404 }));

    await sendResponse(withCors(request, response), outgoing);
  } catch (error) {
    console.error(error);
    await sendResponse(
      Response.json({ error: "Internal server error" }, { status: 500 }),
      outgoing,
    );
  }
});

server.listen(port, hostname, () => {
  console.log(`API listening on http://${hostname}:${port}`);
});
