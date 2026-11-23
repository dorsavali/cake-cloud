export interface ApiEnv {
  WEBSITE_ORIGIN?: string;
  SQUARE_LOCATION_ID?: string;
  SQUARE_TIMEZONE?: string;
  SQUARE_ACCESS_TOKEN: string;
  SQUARE_APPLICATION_ID: string;
  SQUARE_ENVIRONMENT: "sandbox" | "production";
  SQUARE_WEBHOOK_SIGNATURE_KEY: string;
  SQUARE_WEBHOOK_NOTIFICATION_URL: string;
  EMAIL_ENABLED?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_SECURITY?: "starttls" | "tls";
  SMTP_HELLO_USERNAME?: string;
  SMTP_HELLO_PASSWORD?: string;
  SMTP_ORDERS_USERNAME?: string;
  SMTP_ORDERS_PASSWORD?: string;
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
