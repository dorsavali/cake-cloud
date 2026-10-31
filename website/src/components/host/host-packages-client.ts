import { apiUrl } from "@/lib/api";

import type { HostPackage } from "./types";

export type HostPackagesResponse = {
  packages: HostPackage[];
  categories: string[];
};

let cachedResponse: HostPackagesResponse | null = null;
let cachedAt = 0;
let pendingRequest: Promise<HostPackagesResponse> | null = null;
const cacheDurationMs = 5 * 60 * 1000;

export function loadHostPackages(): Promise<HostPackagesResponse> {
  if (cachedResponse && cachedAt + cacheDurationMs > Date.now()) {
    return Promise.resolve(cachedResponse);
  }
  if (pendingRequest) return pendingRequest;

  pendingRequest = fetch(apiUrl("/api/host/packages"))
    .then(async (response) => {
      if (!response.ok) throw new Error("Host package request failed");
      const data = (await response.json()) as Partial<HostPackagesResponse>;
      cachedResponse = {
        packages: data.packages ?? [],
        categories: data.categories ?? [],
      };
      cachedAt = Date.now();
      return cachedResponse;
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}
