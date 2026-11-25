import { apiUrl } from "@/lib/api";

import type { HostPackage } from "./types";

export type HostPackagesResponse = {
  packages: HostPackage[];
  categories: string[];
};

let pendingRequest: Promise<HostPackagesResponse> | null = null;

export function loadHostPackages(): Promise<HostPackagesResponse> {
  if (pendingRequest) return pendingRequest;

  pendingRequest = fetch(apiUrl("/api/host/packages"), { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error("Host package request failed");
      const data = (await response.json()) as Partial<HostPackagesResponse>;
      return {
        packages: data.packages ?? [],
        categories: data.categories ?? [],
      };
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}
