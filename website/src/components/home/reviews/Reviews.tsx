"use client";

import { useEffect, useState } from "react";

import styles from "./Reviews.module.css";

const googleReviewsUrl =
  "https://www.google.com/maps/search/?api=1&query=Cake+Cloud+181+Adelaide+Terrace+Perth+WA+6004";

const reviews = [
  {
    name: "KT",
    initials: "KT",
    text: "The cakes and coffee were excellent, with plenty of variety. The thoughtful customer service during an unexpected situation really stood out.",
    color: "#8b6f61",
  },
  {
    name: "Andrew Bell",
    initials: "AB",
    text: "My custom birthday cake looked stunning and tasted incredible. The lemon, white chocolate and pistachio flavours worked beautifully, and I would happily order again.",
    color: "#718d7f",
  },
  {
    name: "Elnaz Tahsini",
    initials: "ET",
    text: "The coffee was prepared with impressive attention to detail. The fudge brownie and saffron pistachio cookie were both distinctive and delicious.",
    color: "#a27e64",
  },
  {
    name: "Mahsa Ardavani",
    initials: "MA",
    text: "A welcoming hidden gem with beautifully made coffee, fresh pastries and a cosy atmosphere. The friendly team made the whole visit feel special.",
    color: "#7a8e9a",
  },
  {
    name: "sherry MD",
    initials: "SM",
    text: "The pastries were beautiful and delicious, and the coffee made a perfect pairing. A lovely place for quality pastries and a cosy experience.",
    color: "#8f778e",
  },
] as const;

export function Reviews() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [transitionEnabled, setTransitionEnabled] = useState(true);

  useEffect(() => {
    const interval = window.setInterval(
      () => setActiveIndex((current) => current + 1),
      5000,
    );

    return () => window.clearInterval(interval);
  }, []);

  const slides = [...reviews, reviews[0]];

  const handleTransitionEnd = () => {
    if (activeIndex !== reviews.length) return;

    setTransitionEnabled(false);
    setActiveIndex(0);
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => setTransitionEnabled(true)),
    );
  };

  return (
    <section
      dir="ltr"
      aria-label="Customer reviews"
      className="flex min-h-[360px] w-full items-center justify-center overflow-x-hidden px-4 py-8 lg:min-h-[340px] lg:px-8 lg:py-6"
    >
      <div className="w-full max-w-[560px] text-center text-accent-dark lg:max-w-[720px]">
        <a
          href={googleReviewsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 font-signika text-sm transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary lg:text-base"
        >
          <span
            aria-hidden="true"
            className="bg-[conic-gradient(from_-45deg,#4285F4_0_28%,#34A853_28%_43%,#FBBC05_43%_60%,#EA4335_60%_78%,#4285F4_78%)] bg-clip-text font-sans text-lg font-semibold text-transparent"
          >
            G
          </span>
          View on Google Reviews
        </a>

        <div className="mt-7 min-h-[210px] overflow-hidden lg:min-h-[220px]">
          <div
            className={`${styles.track} ${
              transitionEnabled ? "" : styles.withoutTransition
            }`}
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            onTransitionEnd={handleTransitionEnd}
          >
            {slides.map((review, index) => (
              <article
                key={`${review.name}-${index}`}
                aria-hidden={index !== activeIndex}
                className={styles.slide}
              >
                <div className="flex items-center justify-center gap-4">
                  <div
                    aria-hidden="true"
                    className="flex size-14 shrink-0 items-center justify-center rounded-full font-signika text-sm font-medium text-white lg:size-[68px] lg:text-base"
                    style={{ backgroundColor: review.color }}
                  >
                    {review.initials}
                  </div>

                  <div className="text-left">
                    <p className="font-signika text-xl font-normal lg:text-[28px]">
                      {review.name}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        aria-label="5 out of 5 stars"
                        className="tracking-[3px] text-luxury-accent"
                      >
                        ★★★★★
                      </span>
                      <span className="font-signika text-sm font-normal">5</span>
                    </div>
                  </div>
                </div>

                <p className="mx-auto mt-5 max-w-[540px] font-signika text-lg font-light leading-[1.5] lg:max-w-[680px] lg:text-xl lg:leading-[1.6]">
                  {review.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
