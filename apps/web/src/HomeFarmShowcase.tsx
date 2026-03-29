import type { AppStringKey } from "@agriora/core";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "./LocaleContext";

const SLIDE_IMAGES = [
  "/images/farm/01-rice-planting.jpg",
  "/images/farm/02-paddy-plains.jpg",
  "/images/farm/03-tea-harvest.jpg",
  "/images/farm/04-inle-lake-myanmar.jpg",
] as const;

const SLIDE_KEYS: AppStringKey[] = [
  "home.farmSlide1",
  "home.farmSlide2",
  "home.farmSlide3",
  "home.farmSlide4",
];

const ROTATE_MS = 6000;

export function HomeFarmShowcase() {
  const { t, tf } = useI18n();
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setIndex((i) => (i + 1) % SLIDE_IMAGES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  const go = useCallback((i: number) => setIndex(i), []);

  return (
    <section className="farm-showcase" aria-label={t("home.farmShowcaseAria")}>
      <div className="farm-showcase__viewport">
        {SLIDE_IMAGES.map((src, i) => (
          <figure
            key={src}
            className={
              "farm-showcase__slide" + (i === index ? " is-active" : "")
            }
            aria-hidden={i !== index}
          >
            <img
              src={src}
              alt={i === index ? t(SLIDE_KEYS[i]) : ""}
              className="farm-showcase__img"
              width={1600}
              height={1000}
              decoding="async"
              loading={i === 0 ? "eager" : "lazy"}
              sizes="(max-width: 32rem) calc(100vw - 2.5rem), 22rem"
            />
            <figcaption className="farm-showcase__cap">
              {t(SLIDE_KEYS[i])}
            </figcaption>
          </figure>
        ))}
      </div>
      <div
        className="farm-showcase__controls"
        role="group"
        aria-label={t("home.farmControlsAria")}
      >
        {SLIDE_IMAGES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-current={i === index ? "true" : undefined}
            className={
              "farm-showcase__dot" + (i === index ? " is-active" : "")
            }
            onClick={() => go(i)}
            aria-label={tf("home.farmPickPhoto", { n: i + 1 })}
          />
        ))}
      </div>
      <p className="farm-showcase__credits">{t("home.farmCredits")}</p>
    </section>
  );
}
