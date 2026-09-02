"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";

import { IconButton, MenuIcon } from "@/components/ui";
import { CartTrigger } from "@/components/cart";

import styles from "./Header.module.css";
import { MobileMenuDrawer } from "./MobileMenuDrawer";

export function MobileHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  return (
    <>
      <header
        dir="ltr"
        className={`${styles.background} sticky top-0 z-40 grid h-16 grid-cols-[1fr_auto_1fr] items-center px-5 md:hidden`}
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

        <CartTrigger className="justify-self-end" />
      </header>

      <MobileMenuDrawer isOpen={isMenuOpen} onClose={closeMenu} />
    </>
  );
}
