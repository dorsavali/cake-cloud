"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ProductImagePlaceholder } from "@/components/shared/ProductImagePlaceholder";
import { ModifierOptions } from "@/components/daily-menu/product-detail/DrinkOptions";

import { loadHostPackages } from "./host-packages-client";
import { saveHostRequestItem } from "./request-storage";
import type { HostPackage } from "./types";

const money = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 2,
});

export function HostPackageDetail() {
  const packageId = useSearchParams().get("id");

  return (
    <HostPackageDetailContent
      key={packageId ?? "missing"}
      packageId={packageId}
    />
  );
}

function HostPackageDetailContent({ packageId }: { packageId: string | null }) {
  const [hostPackage, setHostPackage] = useState<HostPackage | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [modifierIdsByList, setModifierIdsByList] = useState<
    Record<string, string[]>
  >({});
  const [addedToRequest, setAddedToRequest] = useState(false);
  const [loadState, setLoadState] =
    useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!packageId) return;

    let active = true;
    loadHostPackages()
      .then((data) => {
        if (!active) return;
        const selectedPackage = data.packages.find(
          (item) => item.id === packageId,
        );
        if (!selectedPackage) throw new Error("Host package not found");
        setHostPackage(selectedPackage);
        setGuestCount(selectedPackage.minimumGuests ?? 10);
        setModifierIdsByList(
          Object.fromEntries(
            selectedPackage.modifierLists.map((list) => [
              list.id,
              list.modifiers
                .filter((modifier) => modifier.defaultSelected)
                .map((modifier) => modifier.id),
            ]),
          ),
        );
        setLoadState("success");
      })
      .catch(() => {
        if (active) setLoadState("error");
      });

    return () => { active = false; };
  }, [packageId]);

  if (packageId && loadState === "loading") {
    return <p className="py-40 text-center font-signika text-sm text-accent-dark/65">Loading package...</p>;
  }

  if (loadState === "error" || !hostPackage) {
    return (
      <div className="mx-auto max-w-xl px-6 py-40 text-center">
        <p className="font-signika text-sm text-accent-dark">This package is currently unavailable.</p>
        <Link href="/host" className="mt-5 inline-block font-signika text-sm font-medium text-primary underline underline-offset-4">Back to host packages</Link>
      </div>
    );
  }

  const minimumGuests = hostPackage.minimumGuests ?? 10;
  const selectedModifierIds = Object.values(modifierIdsByList).flat();
  const selectedModifiers = hostPackage.modifierLists.flatMap((list) =>
    list.modifiers.filter((modifier) =>
      selectedModifierIds.includes(modifier.id),
    ),
  );
  const modifierSelectionValid = hostPackage.modifierLists.every((list) => {
    const selectedCount = modifierIdsByList[list.id]?.length ?? 0;
    return (
      selectedCount >= list.minSelected &&
      (list.maxSelected === 0 || selectedCount <= list.maxSelected)
    );
  });
  const unitPrice =
    hostPackage.price.amount +
    selectedModifiers.reduce((sum, modifier) => sum + modifier.price, 0);
  const total =
    hostPackage.priceUnit === "package" ? unitPrice : unitPrice * guestCount;

  const addToRequest = () => {
    const requestItem = {
      id: hostPackage.id,
      name: hostPackage.name,
      image: hostPackage.image,
      guests: guestCount,
      unitPrice,
      priceUnit: hostPackage.priceUnit,
      currency: hostPackage.price.currency,
      minimumGuests,
      maximumGuests: hostPackage.maximumGuests,
      modifierIds: selectedModifierIds,
      modifierNames: selectedModifiers.map((modifier) => modifier.name),
    };

    try {
      saveHostRequestItem(requestItem);
    } catch {
      // Keep the in-page confirmation available when storage is blocked.
    }

    setAddedToRequest(true);
  };

  return (
    <div className="mx-auto w-full max-w-[1220px] px-4 pb-16 pt-2 text-accent-dark lg:px-8 lg:pb-18">
      <Link href="/host" className="inline-flex items-center gap-3 font-signika text-sm text-accent-dark/60 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary">
        <span aria-hidden="true">←</span> Back to Packages
      </Link>

      <article className="mt-3 grid grid-cols-1 items-start gap-4 lg:mt-2 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-6">
        <div className="aspect-square overflow-hidden rounded-xl border border-[#d8cdb8] bg-[#e8e0d3] shadow-[0_8px_25px_rgb(70_66_72_/_5%)] lg:rounded-2xl">
          {hostPackage.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hostPackage.image} alt={hostPackage.name} className="h-full w-full object-cover" />
          ) : (
            <ProductImagePlaceholder className="min-h-64" />
          )}
        </div>

        <div className="flex flex-col rounded-xl border border-[#d8cdb8] bg-[#fbf8f1] px-4 py-4 shadow-[0_8px_25px_rgb(70_66_72_/_5%)] lg:rounded-2xl lg:px-6 lg:py-7">
          <div className="flex flex-wrap gap-2">
            {hostPackage.categories.map((category) => (
              <span key={category} className="rounded-full bg-[#eee8dc] px-3 py-1.5 font-signika text-[9px] font-medium uppercase tracking-[0.16em] text-accent-dark/60">{category}</span>
            ))}
          </div>
          <h1 className="mt-4 font-kalnia text-[22px] font-medium leading-tight tracking-[-0.025em] text-accent-dark lg:text-[26px]">{hostPackage.name}</h1>
          {hostPackage.descriptionHtml ? (
            <div
              className="mt-3 font-signika text-sm leading-relaxed text-accent-dark/65 [&_li]:ml-5 [&_li]:pl-1 [&_p+p]:mt-2 [&_strong]:font-semibold [&_strong]:text-accent-dark/80 [&_ul]:my-2 [&_ul]:list-disc"
              dangerouslySetInnerHTML={{ __html: hostPackage.descriptionHtml }}
            />
          ) : (
            <p className="mt-3 whitespace-pre-line font-signika text-sm leading-relaxed text-accent-dark/65">{hostPackage.description}</p>
          )}

          {hostPackage.modifierLists.length > 0 ? (
            <div className="mt-6 space-y-4 font-signika">
              {hostPackage.modifierLists.map((list) => (
                <ModifierOptions
                  key={list.id}
                  list={list}
                  currency={hostPackage.price.currency}
                  selectedModifierIds={modifierIdsByList[list.id] ?? []}
                  alwaysDropdown
                  onChange={(modifierIds) =>
                    setModifierIdsByList((current) => ({
                      ...current,
                      [list.id]: modifierIds,
                    }))
                  }
                />
              ))}
            </div>
          ) : null}

          {hostPackage.includedItems.length > 0 ? (
            <section className="mt-7" aria-labelledby="included-heading">
              <h2 id="included-heading" className="font-signika text-[9px] font-medium uppercase tracking-[0.24em] text-accent-dark/55">What&apos;s included</h2>
              <ul className="mt-3 space-y-2.5">
                {hostPackage.includedItems.map((item) => (
                  <li key={item} className="flex gap-3 font-signika text-sm text-accent-dark"><span className="text-primary" aria-hidden="true">✓</span>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {hostPackage.priceUnit !== "package" ? (
            <section className="mt-7" aria-labelledby="guest-count-heading">
              <h2 id="guest-count-heading" className="font-signika text-[9px] font-medium uppercase tracking-[0.24em] text-accent-dark/55">Number of guests</h2>
              <p className="mt-1 font-signika text-[11px] text-accent-dark/55">Minimum {minimumGuests} guests · {money.format(unitPrice / 100)}/{hostPackage.priceUnit}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="inline-flex h-11 items-center rounded-full bg-primary px-2 text-white">
                  <button type="button" aria-label="Remove one guest" disabled={guestCount <= minimumGuests} onClick={() => setGuestCount((count) => Math.max(minimumGuests, count - 1))} className="inline-flex size-9 items-center justify-center text-xl disabled:opacity-40">−</button>
                  <output className="min-w-10 text-center font-kalnia text-base">{guestCount}</output>
                  <button type="button" aria-label="Add one guest" disabled={hostPackage.maximumGuests !== null && guestCount >= hostPackage.maximumGuests} onClick={() => setGuestCount((count) => hostPackage.maximumGuests ? Math.min(hostPackage.maximumGuests, count + 1) : count + 1)} className="inline-flex size-9 items-center justify-center text-xl disabled:opacity-40">+</button>
                </div>
                <span className="font-signika text-xs text-accent-dark/55">{guestCount} guests</span>
              </div>
            </section>
          ) : null}

          <div className="mt-7 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border-t border-[#ded4c3] pt-4 lg:flex lg:justify-between lg:gap-3">
            <p className="whitespace-nowrap font-signika text-[20px] text-primary lg:text-[24px]">{money.format(total / 100)}</p>
            <button type="button" disabled={!modifierSelectionValid} onClick={addToRequest} className="inline-flex min-h-11 min-w-0 items-center justify-center whitespace-nowrap rounded-full bg-primary px-2 font-kalnia text-[12px] font-medium text-accent transition-colors [&:hover]:bg-[#5c7669] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-45 lg:min-h-12 lg:min-w-64 lg:flex-none lg:px-4 lg:text-base">{modifierSelectionValid ? "Add to The Request" : "Choose Required Options"}</button>
          </div>
        </div>
      </article>

      {addedToRequest ? (
        <section className="mt-4 rounded-2xl border border-[#cfc2aa] bg-[#f8f3e9]/85 p-4 shadow-[0_5px_20px_rgb(70_66_72_/_4%)]" aria-live="polite">
          <p className="flex items-center gap-3 font-signika text-xs font-medium text-accent-dark">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm text-white" aria-hidden="true">✓</span>
            {hostPackage.name} added to your request.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link href="/host/request" className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 font-kalnia text-sm font-medium text-accent transition-colors [&:hover]:bg-[#5c7669]">Continue to Request</Link>
            <Link href="/host" className="inline-flex min-h-11 items-center justify-center rounded-full border border-luxury-accent bg-accent px-5 font-kalnia text-sm font-medium text-accent-dark transition-colors [&:hover]:border-accent-dark [&:hover]:bg-accent-dark [&:hover]:text-accent">Add Another Package</Link>
          </div>
        </section>
      ) : null}

    </div>
  );
}
