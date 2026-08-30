"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";

import { IconButton, MenuIcon } from "@/components/ui";

import styles from "./Header.module.css";
import { MobileMenuDrawer } from "./MobileMenuDrawer";

export function MobileHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  return (
    <>
      <header
        dir="ltr"
        className={`${styles.background} grid h-16 grid-cols-[1fr_auto_1fr] items-center px-5 md:hidden`}
      >
        <IconButton
          aria-label="Open menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen(true)}
          variant="primary"
          className="justify-self-start"
        >
          <MenuIcon className="h-[22px] w-7" />
        </IconButton>

        <Link href="/" aria-label="Cake Cloud home">
          <Image
            src="/images/logo/hangSignCC.svg"
            alt="Cake Cloud"
            width={45}
            height={42}
            priority
            unoptimized
          />
        </Link>

        <Link
          href="/cart"
          prefetch={false}
          aria-label="Shopping cart"
          className="justify-self-end rounded-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary"
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

      <MobileMenuDrawer isOpen={isMenuOpen} onClose={closeMenu} />
    </>
  );
}
