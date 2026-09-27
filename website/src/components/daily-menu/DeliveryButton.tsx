import Image from "next/image";

export function DeliveryButton() {
  return (
    <button
      type="button"
      aria-label="Delivery via Uber Eats — coming soon"
      aria-disabled="true"
      className="fixed bottom-5 z-30 flex size-14 items-center justify-center rounded-full border border-luxury-accent bg-accent shadow-[0_6px_22px_rgb(70_66_72/18%)] md:bottom-7"
      style={{ right: "max(2rem, calc((100vw - 2048px) / 2 + 3rem))" }}
    >
      <Image
        src="/icons/delivery.svg"
        alt=""
        aria-hidden="true"
        width={35}
        height={32}
        unoptimized
        className="size-8 shrink-0"
      />
    </button>
  );
}
