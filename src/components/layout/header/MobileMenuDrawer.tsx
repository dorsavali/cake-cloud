import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { CloseIcon, IconButton } from "@/components/ui";

import {
  LocationIcon,
  MessageIcon,
} from "./HeaderIcons";
import { mobileNavigation } from "./navigation";

type MobileMenuDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function MobileMenuDrawer({ isOpen, onClose }: MobileMenuDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed left-0 top-0 z-50 h-dvh w-screen transition-[visibility] md:hidden ${
        isOpen
          ? "visible pointer-events-auto"
          : "invisible pointer-events-none delay-300"
      }`}
    >
      <button
        type="button"
        aria-label="Close navigation overlay"
        disabled={!isOpen}
        className={`absolute inset-0 bg-accent-dark/25 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal={isOpen ? "true" : undefined}
        aria-label="Mobile navigation"
        dir="ltr"
        inert={!isOpen}
        className={`fixed left-0 top-0 flex h-dvh w-full max-w-[312px] flex-col bg-accent text-accent-dark shadow-xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-luxury-accent/20 px-5">
          <Link href="/" aria-label="Cake Cloud home" onClick={onClose}>
            <Image
              src="/images/logo/hangSignCC.svg"
              alt="Cake Cloud"
              width={45}
              height={42}
              priority
              unoptimized
            />
          </Link>

          <IconButton
            ref={closeButtonRef}
            aria-label="Close menu"
            onClick={onClose}
          >
            <CloseIcon className="size-6" />
          </IconButton>
        </div>

        <nav aria-label="Mobile navigation" className="px-9 pt-7">
          <ul className="space-y-8">
            {mobileNavigation.map(({ href, label, children }) => (
              <li key={href}>
                {children ? (
                  <details className="group/menu">
                    <summary className="flex cursor-pointer list-none items-center justify-between whitespace-nowrap font-signika text-[17px] font-medium leading-6 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                      {label}
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
                    </summary>
                    <ul className="mt-4 space-y-4 border-l border-luxury-accent/30 pl-4">
                      {children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            prefetch={false}
                            onClick={onClose}
                            className="font-signika text-[15px] font-medium text-accent-dark/70 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <Link
                    href={href}
                    prefetch={false}
                    onClick={onClose}
                    className="font-signika text-[17px] font-medium leading-6 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                  >
                    {label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto border-t border-luxury-accent/20 px-5 py-5 font-signika text-[13px] text-accent-dark/65">
          <div className="flex items-center gap-2">
            <LocationIcon className="size-4 shrink-0" />
            <span>1/180 Royal St, East Perth WA 6004</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <MessageIcon className="size-4 shrink-0" />
            <span>WhatsApp Us</span>
          </div>
          <div className="mt-4 flex items-center gap-5 text-primary">
            <Image
              src="/icons/Instagram.svg"
              alt="Instagram"
              width={20}
              height={20}
              unoptimized
            />
            <Image
              src="/icons/Facebook.svg"
              alt="Facebook"
              width={20}
              height={20}
              unoptimized
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
