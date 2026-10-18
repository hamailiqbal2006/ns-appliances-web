"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useReducedMotion } from "motion/react";
import styles from "./site-intro.module.css";

const SESSION_KEY = "ns-home-intro-seen";
const WORDS = ["NS Home Appliances", "Search", "Products", "Categories", "Visit"];
const EDIT_EASE = "power4.out";

interface SiteIntroProps {
  onNavbarReveal: () => void;
  onComplete: () => void;
}

/** Homepage-only opening overlay; the live hero remains mounted underneath it. */
export function SiteIntro({ onNavbarReveal, onComplete }: SiteIntroProps) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(true);
  const maskRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<SVGSVGElement>(null);
  const arrowPathRef = useRef<SVGPathElement>(null);
  const wordRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  useLayoutEffect(() => {
    const isDevelopment = process.env.NODE_ENV === "development";
    const isProduction = !isDevelopment;
    const hasSeenIntro = isProduction && sessionStorage.getItem(SESSION_KEY) === "true";
    const shouldReduceMotion = isProduction && Boolean(reduceMotion);
    let disposed = false;
    let timeline: gsap.core.Timeline | undefined;
    let resizeFrame = 0;
    let fontTimeout = 0;

    const finish = () => {
      if (disposed) return;
      onComplete();
      setOpen(false);
    };

    if (hasSeenIntro) {
      onNavbarReveal();
      finish();
      return;
    }

    if (isProduction) sessionStorage.setItem(SESSION_KEY, "true");

    const getWordNodes = () => wordRefs.current.filter(
      (word): word is HTMLParagraphElement => Boolean(word)
    );

    const measureMask = () => {
      const mask = maskRef.current;
      const words = getWordNodes();
      if (!mask || words.length !== WORDS.length) return 0;

      const largestWord = Math.max(...words.map((word) => word.getBoundingClientRect().height));
      // This padding is intentionally inside the masked window: Bodoni ascenders,
      // descenders and its optical overshoot never meet the crop edge at rest.
      const safeWindow = Math.ceil(largestWord + Math.max(30, window.innerHeight * 0.045));
      mask.style.setProperty("--intro-word-window", `${safeWindow}px`);
      return safeWindow;
    };

    const getArrowRoute = () => {
      const visit = wordRefs.current[WORDS.length - 1];
      const nav = document.querySelector<HTMLElement>(".site-nav");
      const navCenter = document.querySelector<HTMLElement>(".site-nav-center");
      if (!visit || !nav || !arrowRef.current) return null;

      const visitRect = visit.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();
      const destinationRect = (navCenter ?? nav).getBoundingClientRect();
      return {
        fromX: visitRect.left + visitRect.width / 2 - 15,
        fromY: visitRect.bottom + 12,
        // Aim for the lower edge of the centre nav zone so the arrow visibly
        // hands the title to the brand before it dissolves.
        toX: destinationRect.left + destinationRect.width / 2 - 15,
        toY: navRect.bottom - 2,
      };
    };

    const buildTimeline = () => {
      timeline?.kill();
      const words = getWordNodes();
      const arrow = arrowRef.current;
      const arrowPath = arrowPathRef.current;
      if (disposed || !arrow || !arrowPath || words.length !== WORDS.length) return;

      // Clear a previously interrupted timeline before taking geometry. This is
      // especially important when React Strict Mode remounts the intro.
      gsap.set(words, { clearProps: "transform,opacity,visibility" });
      const maskHeight = measureMask();
      if (!maskHeight) return;
      const travel = Math.ceil(maskHeight * 0.82);
      const route = getArrowRoute();
      const pathLength = arrowPath.getTotalLength();

      gsap.set(words, { autoAlpha: 0, y: travel, willChange: "transform,opacity" });
      gsap.set(words[0], { autoAlpha: 1, y: 0 });
      gsap.set(arrow, { autoAlpha: 0, scale: 0.94, transformOrigin: "50% 100%" });
      gsap.set(arrowPath, { strokeDasharray: pathLength, strokeDashoffset: pathLength });

      if (shouldReduceMotion) {
        onNavbarReveal();
        timeline = gsap.timeline({ onComplete: finish }).to({}, { duration: 0.18 });
        return;
      }

      timeline = gsap.timeline({ onComplete: finish });
      timeline.to({}, { duration: 0.58 });

      for (let index = 0; index < words.length - 1; index += 1) {
        const outgoing = words[index];
        const incoming = words[index + 1];
        timeline
          .to(outgoing, { autoAlpha: 0, y: -travel, duration: 0.26, ease: "power3.in" })
          .fromTo(
            incoming,
            { autoAlpha: 0, y: travel },
            { autoAlpha: 1, y: 0, duration: 0.38, ease: EDIT_EASE },
            ">-0.06"
          )
          .to({}, { duration: index === words.length - 2 ? 0.5 : 0.36 });
      }

      if (!route) {
        onNavbarReveal();
        timeline.to({}, { duration: 0.32 });
        return;
      }

      timeline
        .set(arrow, { x: route.fromX, y: route.fromY, autoAlpha: 1 })
        .to(arrowPath, { strokeDashoffset: 0, duration: 0.22, ease: "power2.out" })
        .to(arrow, { scale: 1, duration: 0.16, ease: "power2.out" }, "<")
        .to(
          arrow,
          { x: route.toX, y: route.toY, duration: 0.86, ease: "power3.inOut" },
          "+=0.08"
        )
        .call(onNavbarReveal, undefined, "<0.58")
        .to(arrow, { autoAlpha: 0, scale: 0.9, duration: 0.16, ease: "power2.in" }, ">-0.04")
        .to({}, { duration: 0.32 });
    };

    const restartForLayout = () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(buildTimeline);
    };

    const begin = () => {
      if (disposed) return;
      buildTimeline();
      window.addEventListener("resize", restartForLayout);
      document.fonts?.addEventListener("loadingdone", restartForLayout);
    };

    // Font metrics are part of the animation geometry. Wait briefly for the
    // loaded brand face, with a bounded fallback so an unavailable font cannot
    // trap the user behind the intro.
    const fontReady = document.fonts?.ready ?? Promise.resolve();
    Promise.race([
      fontReady,
      new Promise<void>((resolve) => {
        fontTimeout = window.setTimeout(resolve, 650);
      }),
    ]).then(begin);

    return () => {
      disposed = true;
      window.clearTimeout(fontTimeout);
      window.cancelAnimationFrame(resizeFrame);
      timeline?.kill();
      window.removeEventListener("resize", restartForLayout);
      document.fonts?.removeEventListener("loadingdone", restartForLayout);
    };
  }, [onComplete, onNavbarReveal, reduceMotion]);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [open]);

  if (!open) return null;

  return (
    <section className={styles.intro} aria-label="Opening NS Home Appliances" role="status">
      <div className={styles.stage} aria-hidden="true">
        <div className={styles.wordMask} ref={maskRef}>
          {WORDS.map((word, index) => (
            <p
              className={`${styles.word}${index === 0 ? ` ${styles.brand}` : ""}`}
              key={word}
              ref={(element) => {
                wordRefs.current[index] = element;
              }}
            >
              {word}
            </p>
          ))}
        </div>
      </div>
      <svg ref={arrowRef} className={styles.arrow} viewBox="0 0 30 58" aria-hidden="true">
        <path ref={arrowPathRef} d="M15 54V9M6 18l9-9 9 9" />
      </svg>
      <span className="sr-only">Opening NS Home Appliances.</span>
    </section>
  );
}
