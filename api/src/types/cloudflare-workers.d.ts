declare module "cloudflare:workers" {
  interface DurableObjectTransaction {
    get<T>(key: string): Promise<T | undefined>;
    put<T>(key: string, value: T): Promise<void>;
  }

  interface DurableObjectStorage {
    transaction<T>(
      callback: (transaction: DurableObjectTransaction) => Promise<T>,
    ): Promise<T>;
    getAlarm(): Promise<number | null>;
    setAlarm(scheduledTime: number | Date): Promise<void>;
  }

  interface DurableObjectState {
    storage: DurableObjectStorage;
    waitUntil(promise: Promise<unknown>): void;
  }

  export abstract class DurableObject<Env = unknown> {
    protected readonly ctx: DurableObjectState;
    protected readonly env: Env;
    constructor(ctx: DurableObjectState, env: Env);
  }
}
