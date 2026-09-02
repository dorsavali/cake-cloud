import Image from "next/image";

import styles from "./MenuIntro.module.css";

function StoreIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
      <path
        d="M4 10v9h16v-9M3 5h18l-1.5 5a2.3 2.3 0 0 1-4.1.7 2.3 2.3 0 0 1-3.8 0 2.3 2.3 0 0 1-3.8 0A2.3 2.3 0 0 1 3.5 10L3 5Zm5 14v-5h4v5m3-5h2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function MenuIntro() {
  return (
    <section
      dir="ltr"
      aria-labelledby="daily-menu-heading"
      className="px-8 pb-7 pt-10"
    >
      <div className="mx-auto max-w-[1476px]">
        <div className="flex items-center justify-between gap-8">
          <h1
            id="daily-menu-heading"
            className="font-kalnia text-[48px] font-medium leading-[1.1] text-accent-dark"
          >
            Today&apos;s Selection
          </h1>

          <button
            type="button"
            className={`${styles.deliveryButton} inline-flex h-12 min-w-[242px] items-center justify-center gap-3 rounded-full border border-luxury-accent bg-[#FAF7F0] px-8 font-signika text-base font-medium text-accent-dark`}
          >
            <Image
              src="/icons/delivery.svg"
              alt=""
              width={35}
              height={32}
              unoptimized
              className="h-6 w-auto"
            />
            Delivery
          </button>
        </div>

        <div className="mt-4 flex min-h-12 items-center gap-3 rounded-2xl border border-[#ddd3be] bg-[#eee8da]/90 px-5 py-3 font-signika text-base font-normal text-accent-dark shadow-[0_2px_8px_rgb(70_66_72_/_6%)]">
          <span className="text-primary">
            <StoreIcon />
          </span>
          <p>
            Online orders through our website are available for <strong>Pickup only.</strong>{" "}
            For delivery, use the Delivery button above.
          </p>
        </div>
      </div>
    </section>
  );
}
