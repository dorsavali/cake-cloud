"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { Pagination } from "@/components/daily-menu/pagination";
import { apiUrl } from "@/lib/api";

import type { HostPackage } from "./types";

type HostPackagesResponse = {
  packages?: HostPackage[];
  categories?: string[];
};

const currencyFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 2,
});

function formatPrice(hostPackage: HostPackage) {
  const amount = currencyFormatter.format(hostPackage.price.amount / 100);
  if (hostPackage.priceUnit === "package") return amount;
  return `${amount}/${hostPackage.priceUnit}`;
}

export function HostPackages() {
  const [packages, setPackages] = useState<HostPackage[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [loadState, setLoadState] =
    useState<"loading" | "success" | "error">("loading");
  const packagesStartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updatePageSize = () => {
      setPageSize(mediaQuery.matches ? 6 : 9);
      setCurrentPage(1);
    };

    updatePageSize();
    mediaQuery.addEventListener("change", updatePageSize);
    return () => mediaQuery.removeEventListener("change", updatePageSize);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPackages() {
      try {
        const response = await fetch(apiUrl("/api/host/packages"), {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Host package request failed");
        const data = (await response.json()) as HostPackagesResponse;
        setPackages(data.packages ?? []);
        setCategories(data.categories ?? []);
        setLoadState("success");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setLoadState("error");
      }
    }

    void loadPackages();
    return () => controller.abort();
  }, []);

  const visiblePackages = useMemo(
    () =>
      activeCategory === "All"
        ? packages
        : packages.filter((hostPackage) =>
            hostPackage.categories.includes(activeCategory),
          ),
    [activeCategory, packages],
  );
  const totalPages = Math.max(1, Math.ceil(visiblePackages.length / pageSize));
  const paginatedPackages = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visiblePackages.slice(start, start + pageSize);
  }, [currentPage, pageSize, visiblePackages]);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    packagesStartRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <section className="mx-auto w-full max-w-[1050px] px-4 pb-24 pt-12 lg:px-0">
      <div className="mb-4 pl-0.5">
        <p className="font-signika text-[10px] font-medium uppercase tracking-[0.24em] text-accent-dark/55">
          Packages &amp; events
        </p>
        <h1 className="mt-2 font-kalnia text-[32px] font-medium leading-none tracking-[-0.025em] text-accent-dark md:text-[38px]">
          Host with Cake Cloud
        </h1>
        <p className="mt-2 font-signika text-[13px] text-accent-dark/65">
          Ready-to-book packages for corporate events, celebrations, and
          gatherings.
        </p>
      </div>

      <div className="flex min-h-14 items-center justify-between rounded-xl border border-[#d7ccb7] bg-[#f8f3e9]/90 px-5 shadow-[0_4px_16px_rgb(70_66_72_/_4%)]">
        <p className="font-signika text-[11px] font-medium text-accent-dark md:text-[13px]">
          Complex or Large Order?
        </p>
        <Link
          href="/custom-cakes/from-scratch"
          className="inline-flex min-w-40 items-center justify-center rounded-full bg-primary px-4 py-2 font-kalnia text-[11px] font-medium text-white transition-colors hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:min-w-44 md:px-5 md:text-[13px]"
        >
          Go to Enquiry Form
        </Link>
      </div>

      <div
        className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:mt-7 md:flex-wrap md:overflow-visible md:px-0 md:pb-0"
        role="group"
        aria-label="Filter host packages"
      >
        {["All", ...categories].map((category) => {
          const isActive = category === activeCategory;
          return (
            <button
              key={category}
              type="button"
              aria-pressed={isActive}
              onClick={() => handleCategoryChange(category)}
              className={`shrink-0 rounded-full border px-5 py-2 font-signika text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                isActive
                  ? "border-primary bg-primary text-white"
                  : "border-[#d8cdb8] bg-[#f8f3e9]/60 text-accent-dark hover:border-primary hover:text-primary"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {loadState === "loading" ? (
        <p className="py-24 text-center font-signika text-sm text-accent-dark/65">
          Loading packages...
        </p>
      ) : loadState === "error" ? (
        <p className="py-24 text-center font-signika text-sm text-accent-dark">
          Host packages are temporarily unavailable.
        </p>
      ) : visiblePackages.length === 0 ? (
        <p className="py-24 text-center font-signika text-sm text-accent-dark/65">
          No packages are available in this category yet.
        </p>
      ) : (
        <div ref={packagesStartRef} className="scroll-mt-24">
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {paginatedPackages.map((hostPackage) => (
            <article
              key={hostPackage.id}
              className="group relative overflow-hidden rounded-xl border border-[#d8cdb8] bg-[#fbf8f1] shadow-[0_5px_20px_rgb(70_66_72_/_5%)] transition-shadow hover:shadow-[0_10px_28px_rgb(70_66_72_/_12%)] focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-primary"
            >
              <Link
                href={`/events/package?id=${encodeURIComponent(hostPackage.id)}`}
                aria-label={`View ${hostPackage.name}`}
                className="absolute inset-0 z-10 rounded-xl"
              />
              <div className="aspect-[1.55] overflow-hidden bg-[#e8e0d3]">
                {hostPackage.image ? (
                  // Square image hosts vary between Sandbox and Production.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={hostPackage.image}
                    alt={hostPackage.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-kalnia text-sm text-accent-dark/45">
                    Cake Cloud
                  </div>
                )}
              </div>

              <div className="flex min-h-[168px] flex-col px-4 pb-4 pt-3">
                <div className="flex flex-wrap gap-1.5">
                  {hostPackage.categories.map((category) => (
                    <span
                      key={category}
                      className="rounded-full bg-[#eee8dc] px-2 py-1 font-signika text-[8px] font-medium uppercase tracking-[0.12em] text-accent-dark/60"
                    >
                      {category}
                    </span>
                  ))}
                </div>

                <h2 className="mt-2 font-kalnia text-[18px] font-medium leading-tight text-accent-dark">
                  {hostPackage.name}
                </h2>
                <p className="mt-2 line-clamp-2 font-signika text-[11px] leading-[1.45] text-accent-dark/65">
                  {hostPackage.description}
                </p>
                {hostPackage.maximumGuests ? (
                  <p className="mt-2 font-signika text-[10px] text-accent-dark/55">
                    Up to {hostPackage.maximumGuests} guests
                  </p>
                ) : null}

                <div className="mt-auto flex items-end justify-between border-t border-[#ded4c3] pt-3">
                  <p className="font-kalnia text-[18px] leading-none text-primary">
                    {formatPrice(hostPackage)}
                    {hostPackage.minimumGuests ? (
                      <span className="font-signika text-[11px] text-accent-dark/55">
                        {" "}· min. {hostPackage.minimumGuests}
                      </span>
                    ) : null}
                  </p>
                  <span className="font-signika text-[10px] font-medium text-primary transition-colors group-hover:text-accent-dark">
                    View <span aria-hidden="true">→</span>
                  </span>
                </div>
              </div>
            </article>
          ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </section>
  );
}
