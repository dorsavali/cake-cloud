export interface ApiEnv {
  SQUARE_ACCESS_TOKEN: string;
  SQUARE_APPLICATION_ID: string;
  SQUARE_ENVIRONMENT: "sandbox" | "production";
  SQUARE_WEBHOOK_SIGNATURE_KEY: string;
  SQUARE_WEBHOOK_NOTIFICATION_URL: string;
}

export interface WorkerEnv extends ApiEnv {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}
