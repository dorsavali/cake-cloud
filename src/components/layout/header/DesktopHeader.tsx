import Image from "next/image";
import Link from "next/link";

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
        <ul className="flex items-center gap-14 lg:gap-20">
          {desktopNavigation.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                prefetch={false}
                className="font-signika text-base font-medium text-accent-dark transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Link
        href="/cart"
        prefetch={false}
        aria-label="Shopping cart"
        className="justify-self-end rounded-sm outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Image
          src="/icons/cart.svg"
          alt=""
          width={38}
          height={38}
          unoptimized
        />
      </Link>
    </header>
  );
}
