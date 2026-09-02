export interface ApiEnv {
  SQUARE_ACCESS_TOKEN: string;
  SQUARE_APPLICATION_ID: string;
  SQUARE_ENVIRONMENT: "sandbox" | "production";
}

export interface WorkerEnv extends ApiEnv {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}
