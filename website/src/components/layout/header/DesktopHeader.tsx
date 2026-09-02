import Image from "next/image";
import Link from "next/link";

import { CartTrigger } from "@/components/cart";

import { desktopNavigation } from "./navigation";
import styles from "./Header.module.css";

export function DesktopHeader() {
  return (
    <header
      dir="ltr"
      className={`${styles.background} sticky top-0 z-40 hidden h-16 w-full grid-cols-[1fr_auto_1fr] items-center px-8 md:grid`}
    >
      <Link
        href="/"
        aria-label="Cake Cloud home"
        className="w-fit rounded-sm outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Image
          src="/images/logo/hangSignCC.svg"
          alt="Cake Cloud"
          width={45}
          height={42}
          priority
          unoptimized
        />
      </Link>

      <nav aria-label="Main navigation">
        <ul className="flex items-center gap-1 lg:gap-3 xl:gap-6">
          {desktopNavigation.map(({ href, label, children }) => (
            <li
              key={href}
              className={children ? `${styles.menuItem} relative` : undefined}
            >
              <Link
                href={href}
                prefetch={false}
                className={`${styles.navLink} flex shrink-0 items-center gap-2 whitespace-nowrap font-signika text-base font-medium text-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
              >
                {label}
                {children && (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 12 8"
                    className="h-2 w-3 shrink-0 text-primary"
                  >
                    <path
                      d="m1 1.25 5 5 5-5"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                    />
                  </svg>
                )}
              </Link>

              {children && (
                <div
                  className={`${styles.dropdownPanel} absolute left-1/2 top-full w-64 pt-1`}
                >
                  <ul className={`${styles.dropdownMenu} px-3 py-4`}>
                    {children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          prefetch={false}
                          className={`${styles.dropdownLink} block whitespace-nowrap px-4 py-3 font-signika text-base font-medium text-accent-dark focus-visible:outline-2 focus-visible:outline-primary`}
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center gap-6 justify-self-end">
        <Link
          href="/club"
          prefetch={false}
          aria-label="Cake Cloud Club"
          className="inline-flex h-11 min-w-[6.5rem] items-center justify-center rounded-full border-2 border-luxury-accent bg-luxury-accent px-5 font-signika text-base font-semibold leading-none text-accent-dark transition-colors duration-200 [&:hover]:border-accent-dark [&:hover]:bg-accent-dark [&:hover]:text-luxury-accent focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary"
        >
          CC Club
        </Link>

        <CartTrigger />
      </div>
    </header>
  );
}
