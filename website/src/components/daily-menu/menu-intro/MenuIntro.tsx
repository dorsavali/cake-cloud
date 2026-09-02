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
      className="px-4 pb-7 pt-8 md:px-8 md:pt-10"
    >
      <div className="mx-auto max-w-[1476px]">
        <div className="flex items-start justify-between gap-4">
          <h1
            id="daily-menu-heading"
            className="max-w-[180px] font-kalnia text-[34px] font-medium leading-[1.16] text-accent-dark max-[380px]:max-w-[150px] max-[380px]:text-[31px] md:max-w-none md:text-[48px] md:leading-[1.1]"
          >
            Today&apos;s Selection
          </h1>

          <button
            type="button"
            className={`${styles.deliveryButton} inline-flex h-12 min-w-[145px] items-center justify-center gap-2 rounded-full border border-luxury-accent bg-[#FAF7F0] px-4 font-signika text-base font-medium text-accent-dark max-[420px]:min-w-[135px] md:min-w-[242px] md:gap-3 md:px-8`}
          >
            <Image
              src="/icons/delivery.svg"
              alt=""
              width={35}
              height={32}
              unoptimized
              className="h-6 w-auto md:h-6"
            />
            Delivery
          </button>
        </div>

        <div className="mt-6 flex min-h-[100px] items-center gap-3 rounded-2xl border border-[#ddd3be] bg-[#eee8da]/90 px-5 py-4 font-signika text-sm font-normal leading-5 text-accent-dark shadow-[0_2px_8px_rgb(70_66_72_/_6%)] md:mt-4 md:min-h-12 md:py-3 md:text-base md:leading-normal">
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
