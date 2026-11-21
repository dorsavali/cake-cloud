"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  hostRequestChangedEvent,
  readHostRequest,
  type HostRequestItem,
} from "./request-storage";

export function HostRequestBar() {
  const [items, setItems] = useState<HostRequestItem[]>([]);

  useEffect(() => {
    const updateItems = () => setItems(readHostRequest());
    updateItems();
    window.addEventListener(hostRequestChangedEvent, updateItems);
    window.addEventListener("storage", updateItems);
    return () => {
      window.removeEventListener(hostRequestChangedEvent, updateItems);
      window.removeEventListener("storage", updateItems);
    };
  }, []);

  if (items.length === 0) return null;

  const firstItem = items[0];
  const packageLabel = items.length === 1 ? "Package" : "Packages";

  return (
    <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-[#ded4c3] bg-[#fbf8f1]/95 px-4 py-3 shadow-[0_-8px_24px_rgb(70_66_72_/_8%)] backdrop-blur-sm md:px-6">
      <div className="mx-auto flex max-w-[1476px] items-center justify-between gap-4 md:px-2">
        <div className="min-w-0">
          <p className="truncate font-kalnia text-xs text-accent-dark md:text-lg">
            Your Request · {items.length} {packageLabel}
          </p>
          <p className="mt-1 truncate font-signika text-[9px] leading-3 text-accent-dark/60 md:mt-1.5 md:text-sm md:leading-normal md:text-accent-dark/70">
            {firstItem.name} x{firstItem.guests} Guests
            {items.length > 1 ? ` · +${items.length - 1} more` : ""}
          </p>
        </div>
        <Link
          href="/host/request"
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-primary px-5 font-kalnia text-[11px] font-medium text-accent transition-colors [&:hover]:bg-[#5c7669] md:min-h-12 md:min-w-52 md:px-8 md:text-base"
        >
          Review Request
        </Link>
      </div>
    </aside>
  );
}
