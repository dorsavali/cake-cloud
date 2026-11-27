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
  {
    name: "k w g c PANA",
    initials: "KP",
    text: "O M G!! Really great job. This shop is new, and all the cake is so amazing! I bought five cakes for my bestie's birthday; all of them were delicious and fabulous. The gentleman was helpful and friendly, with great hospitality. Definitely coming back!",
    color: "#8a765d",
  },
  {
    name: "F P",
    initials: "FP",
    text: "My experience was hands down the absolute best at Cake Cloud. Cas and chef Parisa listened to exactly what I wanted for our wedding cake. The result was stunning: a gorgeous vanilla cake with a cacao cream giant rose. They went above and beyond and made our day extremely special!",
    color: "#a2647c",
  },
  {
    name: "Alaa Alshibi",
    initials: "AA",
    text: "What a lovely experience with Cake Cloud. The customer service was warm and welcoming, the cake was beautiful and delicious, and the price was very reasonable. Everything felt professional, friendly and well organised. I highly recommend Cake Cloud.",
    color: "#5c8fa6",
  },
  {
    name: "Alexiea Lulue",
    initials: "AL",
    text: "We were looking for a last-minute birthday cake and the owner was so accommodating. He offered different solutions, helped with the text we wanted and gave us a discount on a bigger cake. I would not buy my cake anywhere else now!",
    color: "#7d756c",
  },
  {
    name: "JIM L",
    initials: "JL",
    text: "Cake Cloud Boutique Pastries in East Perth is the best place to have coffee, cake or pastries. Everything is made fresh daily on the premises. I recommend this place to everyone; you will not be disappointed.",
    color: "#6f8391",
  },
  {
    name: "Sophia",
    initials: "S",
    text: "Great Dubai Chocolate brownie. Cold, fudgey, rich, dense and oh so good! Great coffees too.",
    color: "#92745f",
  },
] as const;

export function Reviews() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [transitionEnabled, setTransitionEnabled] = useState(true);

  useEffect(() => {
    const interval = window.setInterval(
      () =>
        setActiveIndex((current) =>
          current < reviews.length ? current + 1 : current,
        ),
      5000,
    );

    return () => window.clearInterval(interval);
  }, []);

  const slides = [...reviews, reviews[0]];

  const handleTransitionEnd = (
    event: React.TransitionEvent<HTMLDivElement>,
  ) => {
    if (event.propertyName !== "transform") return;
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
      className="flex min-h-[360px] w-full items-center justify-center overflow-x-hidden px-4 py-5 lg:min-h-[340px] lg:px-8 lg:py-[35px]"
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

                <p
                  className={`${styles.reviewText} mx-auto mt-5 max-w-[540px] font-signika text-lg font-light leading-[1.5] lg:max-w-[680px] lg:text-xl lg:leading-[1.6]`}
                >
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
