"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import type { CakeDesign } from "./cake-types";

type CatalogState = {
  revision: number;
  designs?: CakeDesign[];
  error?: string;
};

export function useCakeCatalog() {
  const [state, setState] = useState<CatalogState>({ revision: 0 });
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();

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
          revision,
          designs: Array.isArray(data?.designs) ? data.designs : [],
        });
      })
      .catch((error: Error) => {
        if (controller.signal.aborted || error.name === "AbortError") return;
        setState({ revision, error: error.message });
      });

    return () => controller.abort();
  }, [revision]);

  return {
    designs: state.designs,
    error: state.revision === revision ? state.error : undefined,
    retry,
  };
}
