"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./site-intro.module.css";

const SESSION_KEY = "ns-home-intro-seen";
const WORDS = ["NS Home Appliances", "Search", "Products", "Categories", "Visit"];
const EASE = [0.22, 1, 0.36, 1] as const;

interface SiteIntroProps {
  onNavbarReveal: () => void;
  onComplete: () => void;
}

/** A homepage-only, client-side opening overlay. The storefront stays mounted underneath. */
export function SiteIntro({ onNavbarReveal, onComplete }: SiteIntroProps) {
  const reduceMotion = useReducedMotion();
  const isDevelopment = process.env.NODE_ENV === "development";
  // Local previews intentionally use the complete sequence on every refresh,
  // regardless of an OS or browser reduced-motion preference.
  const shouldReduceMotion = !isDevelopment && reduceMotion;
  const [open, setOpen] = useState(true);
  const [wordIndex, setWordIndex] = useState(0);
  const [arrowVisible, setArrowVisible] = useState(false);
  const [arrowRising, setArrowRising] = useState(false);
  const [arrowDistance, setArrowDistance] = useState(-280);
  const arrowRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!arrowVisible || !arrowRef.current) return;

    const updateArrowDistance = () => {
      const navbar = document.querySelector<HTMLElement>(".site-nav");
      const arrow = arrowRef.current;
      if (!navbar || !arrow) return;

      const navRect = navbar.getBoundingClientRect();
      const arrowRect = arrow.getBoundingClientRect();
      setArrowDistance(navRect.top + navRect.height / 2 - (arrowRect.top + arrowRect.height / 2));
    };

    const frame = window.requestAnimationFrame(updateArrowDistance);
    window.addEventListener("resize", updateArrowDistance);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateArrowDistance);
    };
  }, [arrowVisible]);

  useEffect(() => {
    const isProduction = process.env.NODE_ENV === "production";
    const hasSeenIntro = isProduction && sessionStorage.getItem(SESSION_KEY) === "true";

    const timerIds: number[] = [];
    const schedule = (callback: () => void, delay: number) => {
      timerIds.push(window.setTimeout(callback, delay));
    };

    if (hasSeenIntro) {
      onNavbarReveal();
      schedule(() => {
        onComplete();
        setOpen(false);
      }, 0);
      return () => timerIds.forEach((timer) => window.clearTimeout(timer));
    }

    if (isProduction) sessionStorage.setItem(SESSION_KEY, "true");

    if (shouldReduceMotion) {
      schedule(() => setArrowVisible(true), 160);
      schedule(() => {
        setArrowRising(true);
        onNavbarReveal();
      }, 280);
      schedule(() => {
        onComplete();
        setOpen(false);
      }, 640);
    } else {
      [520, 1_040, 1_560, 2_080].forEach((delay, index) =>
        schedule(() => setWordIndex(index + 1), delay)
      );
      schedule(() => setArrowVisible(true), 2_560);
      schedule(() => {
        setArrowRising(true);
      }, 2_820);
      schedule(() => {
        onNavbarReveal();
      }, 3_280);
      schedule(() => {
        onComplete();
        setOpen(false);
      }, 3_760);
    }

    return () => timerIds.forEach((timer) => window.clearTimeout(timer));
  }, [isDevelopment, onComplete, onNavbarReveal, shouldReduceMotion]);

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
    <motion.section
      className={styles.intro}
      aria-label="Opening NS Home Appliances"
      role="status"
      animate={{ opacity: 1 }}
      transition={{ duration: shouldReduceMotion ? 0.001 : 0.2 }}
    >
      <div className={styles.stage} aria-hidden="true">
        <AnimatePresence initial={false} mode="sync">
          <motion.p
            key={WORDS[wordIndex]}
            className={`${styles.word}${wordIndex === 0 ? ` ${styles.brand}` : ""}`}
            initial={{ opacity: 0, y: "0.62em", clipPath: "inset(100% 0 0 0)" }}
            animate={{ opacity: arrowRising ? 0.18 : 1, y: 0, clipPath: "inset(0 0 0 0)" }}
            exit={{ opacity: 0, y: "-0.62em", clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: shouldReduceMotion ? 0.001 : 0.46, ease: EASE }}
          >
            {WORDS[wordIndex]}
          </motion.p>
        </AnimatePresence>
        <motion.span
          className={styles.arrow}
          aria-hidden="true"
          ref={arrowRef}
          initial={false}
          animate={
            arrowRising
              ? { opacity: 0, y: arrowDistance, scale: 0.86 }
              : { opacity: arrowVisible ? 1 : 0, y: arrowVisible ? 0 : 12, scale: 1 }
          }
          transition={{ duration: shouldReduceMotion ? 0.12 : 0.76, ease: EASE }}
        >
          ↑
        </motion.span>
      </div>
      <span className="sr-only">Opening NS Home Appliances.</span>
    </motion.section>
  );
}
