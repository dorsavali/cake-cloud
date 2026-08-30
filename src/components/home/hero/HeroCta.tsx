import Link from "next/link";

import styles from "./Hero.module.css";

type HeroCtaProps = {
  className?: string;
};

export function HeroCta({ className = "" }: HeroCtaProps) {
  return (
    <Link
      href="/menu"
      prefetch={false}
      className={`${styles.cta} inline-flex h-10 w-[260px] items-center justify-center rounded-full border border-luxury-accent bg-accent/15 font-kalnia text-xl font-medium text-accent-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${className}`}
    >
      Pick Up Your Cake
    </Link>
  );
}
