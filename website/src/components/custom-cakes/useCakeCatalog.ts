"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import type { CakeDesign } from "./cake-types";

type CatalogState = {
  designs?: CakeDesign[];
  error?: string;
};

export function useCakeCatalog() {
  const [state, setState] = useState<CatalogState>({});
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ designs: current.designs, error: undefined }));

    fetch(apiUrl("/api/cake/catalog"), { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Custom cakes are temporarily unavailable.");
        }
        return data;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setState({
          designs: Array.isArray(data?.designs) ? data.designs : [],
        });
      })
      .catch((error: Error) => {
        if (controller.signal.aborted || error.name === "AbortError") return;
        setState({ error: error.message });
      });

    return () => controller.abort();
  }, [revision]);

  return { ...state, retry };
}
