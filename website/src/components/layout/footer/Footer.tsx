import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";

import { desktopNavigation } from "@/components/layout/header/navigation";

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.1 3H4.5A1.5 1.5 0 0 0 3 4.5C3 13.6 10.4 21 19.5 21a1.5 1.5 0 0 0 1.5-1.5v-2.6l-4.2-1.4-1.3 2.2a15.7 15.7 0 0 1-9.2-9.2l2.2-1.3L7.1 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 21v-8h2.8l.4-3H14V8.1c0-.9.3-1.6 1.7-1.6h1.7V3.8c-.8-.1-1.6-.2-2.4-.2-2.4 0-4 1.4-4 4.1V10H8.5v3H11v8h3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <text x="12" y="18" textAnchor="middle" fill="currentColor" fontFamily="Arial, sans-serif" fontSize="19" fontWeight="700">G</text>
    </svg>
  );
}

function UberEatsIcon() {
  return (
    <svg viewBox="0 0 34 24" aria-hidden="true">
      <text x="17" y="10" textAnchor="middle" fill="currentColor" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="700">UBER</text>
      <text x="17" y="19" textAnchor="middle" fill="currentColor" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="700">EATS</text>
    </svg>
  );
}

export function Footer() {
  return (
    <footer
      dir="ltr"
      className="flex items-center justify-center border-t-4 border-luxury-accent bg-primary px-4 py-5 text-accent lg:px-8 lg:py-6"
    >
      <div className="flex w-full max-w-[1100px] flex-col items-center text-center">
        <Image
          src="/images/logo/main.svg"
          alt="Cake Cloud"
          width={400}
          height={349}
          unoptimized
          className="h-auto w-[80px] lg:w-[130px]"
        />

        <nav aria-label="Footer navigation" className="mt-3">
          <ul className="flex flex-wrap items-center justify-center gap-y-3 lg:gap-y-6">
            {desktopNavigation.map((item, index) => (
              <Fragment key={item.label}>
                {index === 3 && (
                  <li aria-hidden="true" className="h-0 basis-full lg:hidden" />
                )}
                <li className="flex items-center">
                  {index > 0 && (
                    <span
                      aria-hidden="true"
                      className={`mx-3 text-sm leading-none text-accent/90 lg:mx-4 ${
                        index === 3 ? "hidden lg:inline" : ""
                      }`}
                    >
                      |
                    </span>
                  )}
                  <Link
                    href={item.href}
                    className="font-signika text-[10px] font-normal leading-[5px] tracking-[0.05em] text-accent transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent lg:text-base lg:leading-5"
                  >
                    {item.label}
                  </Link>
                </li>
              </Fragment>
            ))}
          </ul>
        </nav>

        <div className="mt-5 flex w-fit max-w-full flex-col items-stretch gap-4 font-signika font-light text-accent">
          <a
            href="https://www.google.com/maps/search/?api=1&query=1%2F180+Royal+St+East+Perth+WA+6004"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 text-sm leading-5 tracking-[0.02em] transition-opacity hover:opacity-70 lg:text-xl lg:leading-7"
          >
            <span className="size-5 shrink-0 lg:size-6"><LocationIcon /></span>
            1/180 Royal St, East Perth WA 6004
          </a>

          <div className="flex items-start gap-3 text-center text-sm leading-[1.25] tracking-[0.02em] lg:text-xl">
            <span className="mt-1 size-5 shrink-0 lg:size-6"><ClockIcon /></span>
            <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3 lg:gap-5">
              <span>
                <span className="block">Mon - Fri</span>
                <span className="block whitespace-nowrap">6:30 Am - 5 PM</span>
              </span>
              <span aria-hidden="true" className="text-accent/70">|</span>
              <span>
                <span className="block">Sat - Sun</span>
                <span className="block whitespace-nowrap">8 Am - 4 PM</span>
              </span>
            </div>
          </div>

          <a
            href="https://wa.me/61413681344"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-3 text-sm leading-5 tracking-[0.02em] transition-opacity hover:opacity-70 lg:text-xl lg:leading-7"
          >
            <span className="size-5 shrink-0 lg:size-6"><PhoneIcon /></span>
            WhatsApp Us
          </a>
        </div>

        <div className="mt-4 flex justify-center items-center gap-6">
          <a
            href="https://www.instagram.com/cakecloudau/"
            target="_blank"
            rel="noreferrer"
            aria-label="Cake Cloud on Instagram"
            className="size-6 text-accent transition-opacity hover:opacity-70"
          >
            <InstagramIcon />
          </a>
          <a
            href="https://www.facebook.com/cakecloudau/"
            target="_blank"
            rel="noreferrer"
            aria-label="Cake Cloud on Facebook"
            className="size-6 text-accent transition-opacity hover:opacity-70"
          >
            <FacebookIcon />
          </a>
          <a
            href="https://www.google.com/search?q=Cake+Cloud+East+Perth"
            target="_blank"
            rel="noreferrer"
            aria-label="Find Cake Cloud on Google"
            className="size-6 text-accent transition-opacity hover:opacity-70"
          >
            <GoogleIcon />
          </a>
          <a
            href="https://www.ubereats.com/au/search?q=Cake%20Cloud"
            target="_blank"
            rel="noreferrer"
            aria-label="Order Cake Cloud on Uber Eats"
            className="h-6 w-[34px] text-accent transition-opacity hover:opacity-70"
          >
            <UberEatsIcon />
          </a>
        </div>
      </div>
    </footer>
  );
}
