import type { RenderedEmail } from "../email/order-templates.js";

export interface ApiEnv {
  WEBSITE_ORIGIN?: string;
  SQUARE_LOCATION_ID?: string;
  SQUARE_TIMEZONE?: string;
  SQUARE_ACCESS_TOKEN: string;
  SQUARE_APPLICATION_ID: string;
  SQUARE_ENVIRONMENT: "sandbox" | "production";
  SQUARE_PRODUCTION_CHECKOUT_ENABLED?: string;
  SQUARE_WEBHOOK_SIGNATURE_KEY: string;
  SQUARE_WEBHOOK_NOTIFICATION_URL: string;
  EMAIL_ENABLED?: string;
  EMAIL_FROM?: string;
  EMAIL_ORDERS_TO?: string;
  EMAIL?: {
    send(message: RenderedEmail): Promise<{ messageId: string }>;
  };
  CF_VERSION_METADATA?: { id: string };
  STOREFRONT_CACHE?: {
    get(key: string): Promise<{ etag: string; json<T>(): Promise<T> } | null>;
    put(
      key: string,
      value: string,
      options: {
        onlyIf: { etagMatches: string } | { etagDoesNotMatch: string };
        httpMetadata: { contentType: string };
      },
    ): Promise<object | null>;
  };
  CAKE_BRIEFS?: {
    put(key: string, value: ReadableStream | ArrayBuffer | string, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
    delete(keys: string | string[]): Promise<void>;
  };
  DAILY_INVENTORY_RESERVATIONS?: {
    idFromName(name: string): unknown;
    get(id: unknown): {
      fetch(request: Request): Promise<Response>;
    };
  };
}

export interface WorkerEnv extends ApiEnv {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}
